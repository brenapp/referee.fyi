import { del, get, set } from "idb-keyval";
import type {
  ShareResponse,
  ShareUser,
  WebSocketPayload,
  WebSocketMessage,
  WebSocketPeerMessage,
  WebSocketSender,
  APIRegisterUserResponseBody,
  APIPostCreateResponseBody,
  APIGetInvitationResponseBody,
  APIPutInvitationAcceptResponseBody,
  UserInvitation,
  APIPutInviteResponseBody,
  APIDeleteInviteResponseBody,
  APIGetShareDataResponseBody,
  APIPutIncidentResponseBody,
  APIPatchIncidentResponseBody,
} from "~share/api";
import {
  IncidentWithID,
  deleteIncident,
  getIncident,
  getIncidentsByEvent,
  hasIncident,
  newIncident,
  setIncident,
} from "./incident";
import { toast } from "~components/Toast";
import { queryClient } from "./query";
import { EventEmitter } from "events";
import { exportPublicKey, getKeyPair, getSignRequestHeaders, signWebSocketConnectionURL } from "./crypto";

const URL_BASE = import.meta.env.VITE_REFEREE_FYI_SHARE_SERVER ?? "https://share.referee.fyi";

export type JoinRequest = {
  client_version: string;
  user: {
    name: string;
    key: string;
  };
};

export function isValidJoinRequest(
  value: Record<string, unknown>
): value is JoinRequest {
  const versionMatch = Object.hasOwn(value, "client_version");

  const hasUser =
    Object.hasOwn(value, "user") &&
    Object.hasOwn(value.user as Record<string, string>, "name") &&
    Object.hasOwn(value.user as Record<string, string>, "key") &&
    typeof (value.user as Record<string, string>).name === "string" &&
    typeof (value.user as Record<string, string>).key === "string";

  return versionMatch && hasUser;
}

export function getJoinRequest({ id, name }: ShareUser): JoinRequest {
  return { client_version: __REFEREE_FYI_VERSION__, user: { name, key: id } };
};

export async function getShareName() {
  return (await get<string>("share_name")) ?? "";
}

export async function signedFetch(input: RequestInfo | URL, init?: RequestInit) {

  const request = new Request(input, init);
  const signatureHeaders = await getSignRequestHeaders(request);

  let headers: Headers;
  if (init?.headers) {
    headers = new Headers(init.headers);
  } else if (input instanceof Request) {
    headers = new Headers(input.headers);
  } else {
    headers = new Headers();
  }

  signatureHeaders.forEach((value, key) => headers.set(key, value));

  return fetch(request, {
    headers
  });
};


export async function registerUser(name: string): Promise<ShareResponse<APIRegisterUserResponseBody>> {

  const url = new URL("/api/user", URL_BASE);
  url.searchParams.set("name", name);

  const response = await signedFetch(
    url, {
    method: "POST"
  });

  return response.json();
};


export async function createInstance(sku: string): Promise<ShareResponse<APIPostCreateResponseBody>> {
  const response = await signedFetch(
    new URL(`/api/${sku}/create`, URL_BASE), {
    method: "POST"
  });

  const body: ShareResponse<APIPostCreateResponseBody> = await response.json();

  if (body.success) {
    await set(`invitation_${sku}`, body.data);
    queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });
  };

  return body;
};

export async function fetchInvitation(sku: string) {
  try {
    const response = await signedFetch(
      new URL(`/api/${sku}/invitation`, URL_BASE), {
      method: "GET"
    })

    const body: ShareResponse<APIGetInvitationResponseBody> = await response.json();

    if (!body.success) {
      return null;
    }

    return body;
  } catch (e) {
    return null;
  }
}

export async function getEventInvitation(sku: string): Promise<UserInvitation | null> {
  const current = await get<APIGetInvitationResponseBody>(`invitation_${sku}`);

  if (current) {
    return current;
  }

  const body = await fetchInvitation(sku);

  if (!body || !body.success) {
    return null;
  }

  await set(`invitation_${sku}`, body.data);
  queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });

  return body.data;
};

export async function verifyEventInvitation(sku: string): Promise<UserInvitation | null> {
  const response = await signedFetch(
    new URL(`/api/${sku}/invitation`, URL_BASE), {
    method: "GET"
  });

  if (response.type !== "basic" && response.type !== "default") {
    return null;
  }

  const body: ShareResponse<APIGetInvitationResponseBody> = await response.json();

  if (!body.success && body.reason !== "server_error") {
    await del(`invitation_${sku}`);
    queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });
  }

  if (body.success && body.data.accepted) {
    await set(`invitation_${sku}`, body.data);
    queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });
    return body.data
  }

  return null;
};

export async function acceptEventInvitation(sku: string, invitationId: string): Promise<ShareResponse<APIPutInvitationAcceptResponseBody>> {
  const url = new URL(`/api/${sku}/accept`, URL_BASE);
  url.searchParams.set("invitation", invitationId);

  const response = await signedFetch(
    url, {
    method: "PUT"
  });

  const body: ShareResponse<APIPutInvitationAcceptResponseBody> = await response.json();

  if (!body.success && body.reason !== "server_error") {
    await del(`invitation_${sku}`);
    queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });
  }

  if (body.success) {
    await set(`invitation_${sku}`, body.data);
    queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });
  }

  return body;
};

export async function inviteUser(sku: string, user: string): Promise<ShareResponse<APIPutInviteResponseBody>> {

  const url = new URL(`/api/${sku}/invite`, URL_BASE);
  url.searchParams.set("user", user);

  const response = await signedFetch(url, { method: "PUT" });
  return response.json();
};

export async function removeInvitation(sku: string, user?: string): Promise<ShareResponse<APIDeleteInviteResponseBody>> {
  const { id } = await ShareConnection.getSender();

  const url = new URL(`/api/${sku}/invite`, URL_BASE);
  url.searchParams.set("user", user ?? id);

  const response = await signedFetch(url, { method: "DELETE" });
  const body: ShareResponse<APIDeleteInviteResponseBody> = await response.json();

  if (body.success) {
    await del(`invitation_${sku}`);
    queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });
  }

  return body;
};

export async function getShareData(sku: string): Promise<ShareResponse<APIGetShareDataResponseBody>> {
  const url = new URL(`/api/${sku}/get`, URL_BASE);

  const response = await signedFetch(url);
  return response.json();
};

export async function addServerIncident(incident: IncidentWithID): Promise<ShareResponse<APIPutIncidentResponseBody>> {
  const url = new URL(
    `/api/${incident.event}/incident`,
    URL_BASE
  );

  const response = await signedFetch(url, {
    method: "PUT",
    body: JSON.stringify(incident),
  });
  return response.json();
}

export async function editServerIncident(incident: IncidentWithID): Promise<ShareResponse<APIPatchIncidentResponseBody>> {
  const url = new URL(
    `/api/${incident.event}/incident`,
    URL_BASE
  );

  const response = await signedFetch(url, {
    method: "PATCH",
    body: JSON.stringify(incident),
  });
  return response.json();
}

export async function deleteServerIncident(id: string, sku: string): Promise<ShareResponse<APIPatchIncidentResponseBody>> {
  const url = new URL(
    `/api/${sku}/incident`,
    URL_BASE
  );
  url.searchParams.set("id", id);

  const response = await signedFetch(url, {
    method: "DELETE",
  });
  return response.json();
}


interface ShareConnectionEvents {
  connect: () => void;
  disconnect: () => void;
  error: () => void;
  message: (data: WebSocketPayload<WebSocketMessage>) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface ShareConnection {
  on<U extends keyof ShareConnectionEvents>(
    event: U,
    listener: ShareConnectionEvents[U]
  ): this;
  once<U extends keyof ShareConnectionEvents>(
    event: U,
    listener: ShareConnectionEvents[U]
  ): this;
  off<U extends keyof ShareConnectionEvents>(
    event: U,
    listener: ShareConnectionEvents[U]
  ): this;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class ShareConnection extends EventEmitter {
  ws: WebSocket | null = null;

  sku: string = "";

  user: ShareUser | null = null;
  users: ShareUser[] = [];

  public async setup(sku: string) {

    const invitation = await getEventInvitation(sku);

    if (!invitation) {
      return;
    };

    if (this.isConnected()) {
      return;
    }

    this.cleanup();

    this.sku = sku;

    const { name, id } = await ShareConnection.getSender();
    return this.connect({ name, id });
  }

  static reconnectTimer?: NodeJS.Timeout = undefined;


  public static async getUserId() {
    const { publicKey } = await getKeyPair();
    return exportPublicKey(publicKey, false);
  };

  public static async getSender(): Promise<WebSocketSender & { type: "client" }> {

    const name = await getShareName();
    const id = await this.getUserId();

    return { type: "client", name, id };
  }

  public isConnected() {
    return !!this.ws && this.ws.readyState === this.ws.OPEN;
  };

  public async forceSyncIncidents() {
    const response = await getShareData(this.sku);

    if (!response.success) {
      toast({ type: "error", message: `Error when communicating with sharing server. ${response.details}` })
      return;
    };

    await this.handleWebsocketPayload({
      type: "server_share_info",
      users: this.users,
      date: new Date().toISOString(),
      data: response.data,
      sender: { type: "server" }
    });
  };

  async connect(user: ShareUser) {
    const { name, id } = await ShareConnection.getSender();

    const url = new URL(`/api/${this.sku}/join`, URL_BASE);

    if (url.protocol === "https:") {
      url.protocol = "wss:";
    } else {
      url.protocol = "ws:";
    }

    url.searchParams.set("id", id);
    url.searchParams.set("name", name);


    const signedURL = await signWebSocketConnectionURL(url);

    this.ws = new WebSocket(signedURL);
    this.ws.onmessage = this.handleMessage.bind(this);

    this.ws.onopen = () => this.emit("connect");
    this.ws.onclose = () => {
      clearTimeout(ShareConnection.reconnectTimer);
      ShareConnection.reconnectTimer = setTimeout(
        () => this.connect(user),
        5000
      );
      this.emit("disconnect");
    };
    this.ws.onerror = () => {
      toast({ type: "error", message: "Could not connect to sharing server." });
      this.emit("error");
    };
  }

  async send(message: WebSocketPeerMessage) {
    const sender = await ShareConnection.getSender();
    const payload: WebSocketPayload<WebSocketPeerMessage> = {
      ...message,
      sender,
      date: new Date().toISOString(),
    };
    this.ws?.send(JSON.stringify(payload));
  }

  private async handleWebsocketPayload(data: WebSocketPayload<WebSocketMessage>) {
    switch (data.type) {
      case "add_incident": {
        const has = await hasIncident(data.incident.id);
        if (!has) {
          await newIncident(data.incident, false, data.incident.id);
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
        await deleteIncident(data.id, false);
        queryClient.invalidateQueries({ queryKey: ["incidents"] });
        break;
      }

      // Sent when you first join, We definitely don't want to
      // *delete* incidents the user creates before joining the share, unless they are listed as
      // being deleted on the server.
      case "server_share_info": {
        this.users = data.users;

        for (const incident of data.data.incidents) {
          const has = await hasIncident(incident.id);

          // Handle newly created incidents
          if (!has) {
            await newIncident(incident, false, incident.id);

            // Handle any incidents with different revisions while offline
          } else {
            const current = (await getIncident(incident.id))!;

            const localRevision = current.revision?.count ?? 0;
            const remoteRevision = incident.revision?.count ?? 0;

            if (localRevision > remoteRevision) {
              const response = await editServerIncident(current);
              if (response?.success) {
                current.revision = response.data;
              }
              await setIncident(incident.id, current);
              queryClient.invalidateQueries({ queryKey: ["incidents"] });
            }

            if (remoteRevision > localRevision) {
              await setIncident(incident.id, incident);
              queryClient.invalidateQueries({ queryKey: ["incidents"] });
            }
          }
        }

        // Explicitly delete incidents marked as deleted first.
        for (const id of data.data.deleted) {
          await deleteIncident(id, false);
        }

        const eventIncidents = await getIncidentsByEvent(this.sku);
        const localOnly = eventIncidents.filter((local) =>
          data.data.incidents.every((remote) => local.id !== remote.id)
        );

        for (const incident of localOnly) {
          await this.send({ type: "add_incident", incident });
        }

        break;
      }

      case "server_user_add": {
        toast({ type: "info", message: `${data.user.name} joined.` });
        if (this.users.findIndex(u => u.id === data.user.id) < 0) {
          this.users.push(data.user);
        }
        break;
      }
      case "server_user_remove": {
        toast({ type: "info", message: `${data.user.name} left.` });
        const index = this.users.findIndex((u) => u === data.user);
        if (index > -1) {
          this.users.splice(index, 1);
        }
        break;
      }
      case "message": {
        const sender =
          data.sender.type === "server" ? "Server" : data.sender.name;
        toast({ type: "info", message: `${sender}: ${data.message}` });
        break;
      }
    }
  }

  private async handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data) as WebSocketPayload<WebSocketMessage>;
      await this.handleWebsocketPayload(data);
      this.emit("message", data);
    } catch (e) {
      toast({ type: "error", message: `${e}` });
    }
  }

  public cleanup() {
    this.ws?.close();
  }
}
