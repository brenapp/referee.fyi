import {
  APIRegisterUserResponseBody,
  Incident,
  INCIDENT_IGNORE,
  InvitationListItem,
  SCRATCHPAD_IGNORE,
  ShareResponse,
  User,
  UserInvitation,
  WebSocketMessage,
  WebSocketPayload,
  WebSocketPeerMessage,
} from "@referee-fyi/share";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  addServerIncident,
  deleteServerIncident,
  editServerIncident,
  fetchInvitation,
  getAssetUploadURL,
  getSender,
  getShareData,
  getShareProfile,
  registerUser,
  saveShareProfile,
  URL_BASE,
} from "~utils/data/share";
import { signWebSocketConnectionURL } from "~utils/data/crypto";
import {
  addIncident,
  deleteIncident,
  deleteManyIncidents,
  getDeletedIncidentsForEvent,
  getIncidentsByEvent,
  hasIncident,
  addManyIncidents,
  setIncident,
  setManyIncidents,
} from "~utils/data/incident";
import { queryClient } from "~utils/data/query";
import { toast } from "~components/Toast";
import { MatchScratchpad } from "@referee-fyi/share";
import { mergeMap } from "@referee-fyi/consistency";
import {
  getManyMatchScratchpads,
  getScratchpadIdsForEvent,
  setManyMatchScratchpad,
  setMatchScratchpad,
} from "~utils/data/scratchpad";
import { reportMeasurement, setTracingProfile } from "~utils/sentry";
import {
  AssetUploadStatus,
  getLocalAsset,
  getManyAssetUploadStatus,
  getManyLocalAssets,
  LocalAsset,
  setAssetUploadStatus,
} from "~utils/data/assets";

export enum ReadyState {
  Closed = WebSocket.CLOSED,
  Closing = WebSocket.CLOSING,
  Connecting = WebSocket.CONNECTING,
  Open = WebSocket.OPEN,
}

export type UserMetadata = Omit<APIRegisterUserResponseBody, "user">;

export type ShareConnectionData = {
  readyState: ReadyState;
  profile: User;
  userMetadata: UserMetadata;
  websocket: WebSocket | null;
  invitation: UserInvitation | null;
  activeUsers: User[];
  invitations: InvitationListItem[];
  reconnectTimer: NodeJS.Timeout | null;
  assetUploads: Record<string, Promise<ShareResponse<null>>>;
};

export type ShareConnectionActions = {
  handleWebsocketMessage(
    data: WebSocketPayload<WebSocketMessage>
  ): Promise<void>;
  send(message: WebSocketPeerMessage): Promise<void>;
  uploadAsset(sku: string, asset: LocalAsset): Promise<AssetUploadStatus>;
  addIncident(incident: Incident): Promise<void>;
  editIncident(incident: Incident): Promise<void>;
  deleteIncident(id: string): Promise<void>;
  updateScratchpad(id: string, scratchpad: MatchScratchpad): Promise<void>;
  connect(invitation: UserInvitation): Promise<void>;
  disconnect(): Promise<void>;
  forceSync(): Promise<void>;
  updateProfile(
    profile: Partial<User>
  ): Promise<ShareResponse<APIRegisterUserResponseBody>>;
};

type ShareConnection = ShareConnectionData & ShareConnectionActions;

const useShareConnectionInternal = create<ShareConnection>((set, get) => ({
  readyState: WebSocket.CLOSED,
  websocket: null,
  invitation: null,

  activeUsers: [],
  invitations: [],

  assetUploads: {},

  profile: { name: "", key: "" },
  userMetadata: { isSystemKey: false },
  updateProfile: async (updates) => {
    const current = await getShareProfile();

    const profile = { ...get().profile, ...current, ...updates };
    set({ profile });
    saveShareProfile(profile);

    const user = await registerUser(profile);

    const userMetadata: UserMetadata = user.success
      ? user.data
      : { isSystemKey: false };

    set({ userMetadata });
    setTracingProfile({
      id: profile.key,
      username: profile.name,
      userMetadata,
    });

    return user;
  },

  reconnectTimer: null,

  forceSync: async () => {
    const start = performance.now();
    const sku = get().invitation?.sku;
    if (!sku) {
      return;
    }

    const response = await getShareData(sku);

    if (!response.success) {
      toast({
        type: "error",
        message: `Error when communicating with sharing server. ${response.details}`,
        context: JSON.stringify(response),
      });
      return;
    }

    const store = get();

    await store.handleWebsocketMessage({
      ...response.data,
      date: new Date().toISOString(),
      sender: { type: "server" },
    });

    const end = performance.now();

    toast({
      type: "info",
      message:
        "Synchronized with the server!" +
        (import.meta.env.DEV ? ` (Took ${end - start}ms)` : ""),
    });
  },

  handleWebsocketMessage: async (data: WebSocketPayload<WebSocketMessage>) => {
    const store = get();
    switch (data.type) {
      case "add_incident": {
        const has = await hasIncident(data.incident.id);
        if (!has) {
          await addIncident(data.incident);
          queryClient.invalidateQueries({ queryKey: ["incidents"] });
        }
        break;
      }
      case "update_incident": {
        await setIncident(data.incident.id, data.incident);
        queryClient.invalidateQueries({ queryKey: ["incidents"] });
        break;
      }
      case "remove_incident": {
        await deleteIncident(data.id);
        queryClient.invalidateQueries({ queryKey: ["incidents"] });
        break;
      }

      // Sent when you first join, We definitely don't want to
      // *delete* incidents the user creates before joining the share, unless they are listed as
      // being deleted on the server.
      case "server_share_info": {
        const start = performance.now();
        set({
          activeUsers: data.users.active,
          invitations: data.users.invitations,
        });

        // Merge Incident State
        const localIncidents = await getIncidentsByEvent(data.sku);
        const localDeletedIncidents = await getDeletedIncidentsForEvent(
          data.sku
        );
        const incidentsResult = mergeMap({
          local: {
            values: Object.fromEntries(localIncidents.map((i) => [i.id, i])),
            deleted: [...localDeletedIncidents],
          },
          remote: data.incidents,
          ignore: INCIDENT_IGNORE,
        });

        // Update Remote
        await Promise.all(
          incidentsResult.remote.create.map((id) =>
            store.addIncident(incidentsResult.resolved.values[id])
          )
        );
        await Promise.all(
          incidentsResult.remote.update.map((id) =>
            store.editIncident(incidentsResult.resolved.values[id])
          )
        );
        await Promise.all(
          incidentsResult.remote.remove.map((id) => store.deleteIncident(id))
        );

        // Update Local
        await addManyIncidents(
          incidentsResult.local.create.map(
            (id) => incidentsResult.resolved.values[id]
          )
        );
        await setManyIncidents(
          incidentsResult.local.update.map(
            (id) => incidentsResult.resolved.values[id]
          )
        );
        await deleteManyIncidents(incidentsResult.local.remove);

        // Update Scratchpad State
        const localScratchpadIds = await getScratchpadIdsForEvent(data.sku);
        const localScratchpads = await getManyMatchScratchpads([
          ...localScratchpadIds,
        ]);

        const scratchpadsResults = mergeMap<MatchScratchpad>({
          local: { deleted: [], values: localScratchpads },
          remote: data.scratchpads,
          ignore: SCRATCHPAD_IGNORE,
        });

        // Notify Remote
        const notify = scratchpadsResults.remote.create.concat(
          scratchpadsResults.remote.update
        );
        await Promise.all(
          notify.map((id) =>
            store.updateScratchpad(id, scratchpadsResults.resolved.values[id])
          )
        );

        // Update Local
        const update = scratchpadsResults.local.create.concat(
          scratchpadsResults.local.update
        );
        await setManyMatchScratchpad(
          update.map((id) => [id, scratchpadsResults.resolved.values[id]])
        );

        // Upload assets if needed
        const assets = localIncidents.flatMap((i) => i.assets ?? []);
        const localAssets = (
          await getManyLocalAssets(assets.map((a) => a))
        ).filter((asset) => !!asset);

        const uploadStatus = await getManyAssetUploadStatus(
          localAssets.map((a) => a.id)
        );

        const toUpload = localAssets.filter(
          (_, index) => !uploadStatus[index]?.success
        );

        for (const asset of toUpload) {
          store.uploadAsset(data.sku, asset); // ignoring the response here - we do not want to await this
        }

        const end = performance.now();

        toast({
          type: "info",
          message:
            "Synchronized with the server!" +
            (import.meta.env.DEV ? ` (Took ${end - start}ms)` : ""),
        });

        reportMeasurement("ShareConnection#sync", end - start, "ms");

        queryClient.invalidateQueries({ queryKey: ["incidents"] });
        queryClient.invalidateQueries({ queryKey: ["scratchpad"] });
        queryClient.invalidateQueries({ queryKey: ["scratchpads"] });
        break;
      }
      case "scratchpad_update": {
        await setMatchScratchpad(data.id, data.scratchpad);
        queryClient.invalidateQueries({ queryKey: ["scratchpad"] });
        queryClient.invalidateQueries({ queryKey: ["scratchpads"] });
        break;
      }
      case "server_user_add": {
        toast({ type: "info", message: `${data.user.name} joined.` });
        set({ activeUsers: data.activeUsers, invitations: data.invitations });
        break;
      }
      case "server_user_remove": {
        toast({ type: "info", message: `${data.user.name} left.` });
        set({ activeUsers: data.activeUsers, invitations: data.invitations });
        break;
      }
      case "message": {
        const sender =
          data.sender.type === "server" ? "Server" : data.sender.name;
        toast({ type: "info", message: `${sender}: ${data.message}` });
        break;
      }
    }
  },

  send: async (message: WebSocketPeerMessage) => {
    const sender = await getSender();
    const payload: WebSocketPayload<WebSocketPeerMessage> = {
      ...message,
      sender,
      date: new Date().toISOString(),
    };
    get().websocket?.send(JSON.stringify(payload));
  },

  uploadAsset: async (sku: string, asset: LocalAsset) => {
    const uploadURL = await getAssetUploadURL(sku, asset.id, asset.type);
    if (!uploadURL.success) {
      toast({ type: "warn", message: "Could not upload asset to server." });
      const status: AssetUploadStatus = {
        success: false,
        date: new Date().toISOString(),
        step: "get_upload_url",
      };
      setAssetUploadStatus(asset.id, status);
      return status;
    }

    const file = new File([asset.data], `${sku}-${asset.id}`, {
      type: asset.data.type,
    });

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(uploadURL.data.uploadURL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      toast({ type: "warn", message: "Could not upload asset to server." });
      const status: AssetUploadStatus = {
        success: false,
        date: new Date().toISOString(),
        step: "upload",
      };
      setAssetUploadStatus(asset.id, status);
      return status;
    }

    toast({ type: "info", message: `Saved asset to server.` });

    const status: AssetUploadStatus = {
      success: true,
      date: new Date().toISOString(),
      step: "complete",
    };

    setAssetUploadStatus(asset.id, status);
    return status;
  },

  addIncident: async (incident: Incident) => {
    const store = get();
    const connected = store.readyState === WebSocket.OPEN;
    const invitation = store.invitation;

    if (!connected && invitation) {
      await addServerIncident(incident);
      return;
    }

    if (invitation) {
      const assets = await Promise.all(incident.assets?.map(getLocalAsset));
      for (const asset of assets) {
        if (!asset) {
          continue;
        }
        store.uploadAsset(incident.event, asset); // ignoring the response here - we do not want to await this
      }
    }

    return store.send({ type: "add_incident", incident });
  },

  editIncident: async (incident: Incident) => {
    const store = get();
    const connected = store.readyState === WebSocket.OPEN;
    const invitation = store.invitation;
    if (!connected && invitation) {
      await editServerIncident(incident);
      return;
    }

    return get().send({ type: "update_incident", incident });
  },

  deleteIncident: async (id: string) => {
    const store = get();
    const connected = store.readyState === WebSocket.OPEN;
    const invitation = store.invitation;
    if (!connected && invitation) {
      await deleteServerIncident(id, invitation.sku);
      return;
    }

    return get().send({ type: "remove_incident", id });
  },

  updateScratchpad: async (id: string, scratchpad: MatchScratchpad) => {
    return get().send({ type: "scratchpad_update", id, scratchpad });
  },

  connect: async (invitation) => {
    const current = get();
    if (current.invitation && current.invitation.id === invitation.id) {
      return;
    }

    await current.disconnect();

    // Prepare URL
    const url = new URL(`/api/${invitation.sku}/join`, URL_BASE);

    if (url.protocol === "https:") {
      url.protocol = "wss:";
    } else {
      url.protocol = "ws:";
    }

    const { key: id, name } = await getShareProfile();

    url.searchParams.set("id", id);
    url.searchParams.set("name", name);

    const signedURL = await signWebSocketConnectionURL(url);

    const websocket = new WebSocket(signedURL);

    websocket.onopen = () => set({ readyState: WebSocket.OPEN });
    websocket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(
          event.data
        ) as WebSocketPayload<WebSocketMessage>;
        get().handleWebsocketMessage(data);
      } catch (e) {
        toast({
          type: "error",
          message: "Error when communicating with sharing server",
          context: JSON.stringify(e),
        });
      }
    };
    websocket.onclose = async () => {
      await get().disconnect();
      const response = await fetchInvitation(invitation.sku);

      if (!response || !response.success) {
        return;
      }

      set({
        reconnectTimer: setTimeout(() => get().connect(response.data), 2000),
      });
    };
    websocket.onerror = (e) => {
      toast({
        type: "info",
        message: "Reconnecting...",
        context: JSON.stringify(e),
      });
      websocket.close();
    };

    set({
      readyState: WebSocket.CONNECTING,
      activeUsers: [],
      invitation,
      websocket,
    });
  },

  disconnect: async () => {
    const current = get();
    current.websocket?.close();

    if (current.reconnectTimer) {
      clearTimeout(current.reconnectTimer);
    }

    return set({
      readyState: WebSocket.CLOSED,
      activeUsers: [],
      invitation: null,
      websocket: null,
      reconnectTimer: null,
    });
  },
}));

export function useShareConnection<const T extends (keyof ShareConnection)[]>(
  keys: T
): Pick<ShareConnection, T[number]> {
  return useShareConnectionInternal(
    useShallow(
      (state) =>
        Object.fromEntries(keys.map((key) => [key, state[key]])) as Pick<
          ShareConnection,
          T[number]
        >
    )
  );
}

// HMR Special Handling
/// <reference types="vite/client" />

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    import.meta.hot!.data.websocket =
      useShareConnectionInternal.getState().websocket;
  });
  import.meta.hot.accept((mod) => {
    if (!mod) {
      import.meta.hot!.data.websocket.close();
      import.meta.hot!.data.websocket = null;
    }
    useShareConnectionInternal.setState({
      websocket: import.meta.hot!.data.websocket,
    });
  });
}
