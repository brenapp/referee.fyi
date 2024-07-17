import {
  Incident,
  InvitationListItem,
  ShareUser,
  UserInvitation,
  WebSocketMessage,
  WebSocketPayload,
  WebSocketPeerMessage,
} from "~share/api";
import { create } from "zustand";
import {
  addServerIncident,
  deleteServerIncident,
  editServerIncident,
  getShareData,
  getShareId,
  getShareName,
  URL_BASE,
} from "~utils/data/share";
import { signWebSocketConnectionURL } from "~utils/data/crypto";
import {
  deleteIncident,
  deleteManyIncidents,
  getDeletedIncidentsForEvent,
  getIncident,
  getIncidentsByEvent,
  getManyIncidents,
  hasIncident,
  hasManyIncidents,
  newIncident,
  newManyIncidents,
  setIncident,
  setManyIncidents,
} from "~utils/data/incident";
import { queryClient } from "~utils/data/query";
import { toast } from "~components/Toast";
import { MatchScratchpad } from "~share/MatchScratchpad";

export enum ReadyState {
  Closed = WebSocket.CLOSED,
  Closing = WebSocket.CLOSING,
  Connecting = WebSocket.CONNECTING,
  Open = WebSocket.OPEN,
}

export type ShareConnectionData = {
  readyState: ReadyState;
  websocket: WebSocket | null;
  invitation: UserInvitation | null;
  activeUsers: ShareUser[];
  invitations: InvitationListItem[];
  reconnectTimer: NodeJS.Timeout | null;
};

export type ShareConnectionActions = {
  handleWebsocketMessage(
    data: WebSocketPayload<WebSocketMessage>
  ): Promise<void>;
  send(message: WebSocketPeerMessage): Promise<void>;
  addIncident(incident: Incident): Promise<void>;
  editIncident(incident: Incident): Promise<void>;
  deleteIncident(id: string): Promise<void>;
  updateScratchpad(id: string, scratchpad: MatchScratchpad): Promise<void>;
  connect(invitation: UserInvitation): Promise<void>;
  disconnect(): Promise<void>;
  forceSync(): Promise<void>;
};

type ShareConnection = ShareConnectionData & ShareConnectionActions;

export const useShareConnection = create<ShareConnection>((set, get) => ({
  readyState: WebSocket.CLOSED,
  websocket: null,
  invitation: null,

  activeUsers: [],
  invitations: [],

  reconnectTimer: null,

  forceSync: async () => {
    const sku = get().invitation?.sku;
    if (!sku) {
      return;
    }

    const response = await getShareData(sku);

    if (!response.success) {
      toast({
        type: "error",
        message: `Error when communicating with sharing server. ${response.details}`,
      });
      return;
    }

    await get().handleWebsocketMessage({
      type: "server_share_info",
      activeUsers: get().activeUsers,
      invitations: get().invitations,
      date: new Date().toISOString(),
      data: response.data.data,
      scratchpads: response.data.scratchpads,
      sender: { type: "server" },
    });

    toast({ type: "info", message: "Synchronized with the server!" });
  },

  handleWebsocketMessage: async (data: WebSocketPayload<WebSocketMessage>) => {
    const store = get();
    switch (data.type) {
      case "add_incident": {
        const has = await hasIncident(data.incident.id);
        if (!has) {
          await newIncident(data.incident, data.incident.id);
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
        set({ activeUsers: data.activeUsers, invitations: data.invitations });

        const hasIncidents = await hasManyIncidents(
          data.data.incidents.map((i) => i.id)
        );

        // Incidents that have been created newly created on other devices
        const remoteOnly = data.data.incidents.filter(
          (_, i) => !hasIncidents[i]
        );
        await newManyIncidents(remoteOnly);

        // Handle incidents that may have changed
        const localAndRemote = data.data.incidents.filter(
          (_, i) => hasIncidents[i]
        );
        const current = await getManyIncidents(localAndRemote.map((i) => i.id));

        const localMoreRecent = localAndRemote.filter(
          (remote, i) =>
            (remote.revision?.count ?? 0) < (current[i]?.revision?.count ?? 0)
        );
        const remoteMoreRecent = localAndRemote.filter(
          (remote, i) =>
            (remote.revision?.count ?? 0) > (current[i]?.revision?.count ?? 0)
        );
        await setManyIncidents(remoteMoreRecent);
        await Promise.all(
          localMoreRecent.map((incident) => editServerIncident(incident))
        );

        // Explicitly delete incidents marked as deleted
        await deleteManyIncidents(data.data.deleted);

        const localDeletes = await getDeletedIncidentsForEvent(data.data.sku);
        const localDeletedOnly = localDeletes.difference(
          new Set(data.data.deleted)
        );
        await Promise.all(
          [...localDeletedOnly].map((i) => store.deleteIncident(i))
        );

        // Send message to other clients for local-only incidents
        const eventIncidents = await getIncidentsByEvent(data.data.sku);
        const localOnly = eventIncidents.filter((local) =>
          data.data.incidents.every((remote) => local.id !== remote.id)
        );

        await Promise.all(
          localOnly.map((incident) => store.addIncident(incident))
        );

        queryClient.invalidateQueries({ queryKey: ["incidents"] });
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
    const id = await getShareId();
    const name = await getShareName();
    const payload: WebSocketPayload<WebSocketPeerMessage> = {
      ...message,
      sender: { type: "client", id, name },
      date: new Date().toISOString(),
    };
    get().websocket?.send(JSON.stringify(payload));
  },

  addIncident: async (incident: Incident) => {
    const connected = get().readyState === WebSocket.OPEN;
    if (!connected) {
      await addServerIncident(incident);
      return;
    }

    return get().send({ type: "add_incident", incident });
  },

  editIncident: async (incident: Incident) => {
    const connected = get().readyState === WebSocket.OPEN;
    if (!connected) {
      await editServerIncident(incident);
      return;
    }

    return get().send({ type: "update_incident", incident });
  },

  deleteIncident: async (id: string) => {
    const connected = get().readyState === WebSocket.OPEN;
    if (!connected) {
      const incident = await getIncident(id);
      if (incident) {
        await deleteServerIncident(id, incident.event);
      }
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

    const id = await getShareId();
    const name = await getShareName();

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
        toast({ type: "error", message: `${e}` });
      }
    };
    websocket.onclose = async () => {
      await get().disconnect();
      set({
        reconnectTimer: setTimeout(() => get().connect(invitation), 5000),
      });
    };
    websocket.onerror = () => {
      toast({ type: "error", message: "Could not connect to sharing server." });
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
