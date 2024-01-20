import { del, get, set } from "idb-keyval";
import type {
  ShareResponse,
  CreateShareResponse,
  EventIncidents,
  ShareUser,
  WebSocketPayload,
  WebSocketMessage,
  WebSocketPeerMessage,
  WebSocketServerShareInfoMessage,
} from "~share/api";
import {
  IncidentWithID,
  deleteIncident,
  getIncidentsByEvent,
  hasIncident,
  newIncident,
  setIncident,
} from "./incident";
import { toast } from "~components/Toast";
import { queryClient } from "./query";

const URL_BASE = import.meta.env.DEV ? "http://localhost:8787" : "https://referee-fyi-share.bren.workers.dev";

export async function getShareData(sku: string, code: string) {
  const response = await fetch(
    new URL(`/api/share/${sku}/${code}/get`, URL_BASE)
  );

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<ShareResponse<WebSocketServerShareInfoMessage>>;

};

export type JoinShareOptions = {
  sku: string;
  code: string
};

export async function joinShare({ sku, code }: JoinShareOptions) {
  await set(`share_${sku}`, code);
  queryClient.invalidateQueries({ queryKey: ["share_code"] });
};

export async function leaveShare(sku: string) {
  await del(`share_${sku}`);
  queryClient.invalidateQueries({ queryKey: ["share_code"] });
};


export async function createShare(
  incidents: EventIncidents
): Promise<ShareResponse<CreateShareResponse>> {
  try {
    const response = await fetch(
      new URL(`/api/create/${incidents.sku}`, URL_BASE),
      {
        method: "POST",
        body: JSON.stringify(incidents),
      }
    );

    if (!response.ok) {
      return response.json();
    }

    const body = await response.json() as ShareResponse<CreateShareResponse>;

    if (!body.success) {
      return body;
    };

    await set(`share_${incidents.sku}`, body.data.code);
    queryClient.invalidateQueries({ queryKey: ["share_code"] });

    return body;
  } catch (e) {
    return {
      success: false,
      reason: "bad_request",
      details: `${e}`,
    };
  }
}


export async function addServerIncident(incident: IncidentWithID) {
  const code = await get<string>(`share_${incident.event}`);
  const userId = await ShareConnection.getUserId();

  if (!code) {
    return;
  }

  const url = new URL(
    `/api/share/${incident.event}/${code}/incident`, URL_BASE
  );

  url.searchParams.set("user_id", userId);

  return fetch(url, {
    method: "PUT",
    body: JSON.stringify(incident),
  });
}

export async function editServerIncident(incident: IncidentWithID) {
  const code = await get<string>(`share_${incident.event}`);
  const userId = await ShareConnection.getUserId();

  if (!code) {
    return;
  }

  const url = new URL(
    `/api/share/${incident.event}/${code}/incident`, URL_BASE
  );

  url.searchParams.set("user_id", userId);

  return fetch(url, {
    method: "PATCH",
    body: JSON.stringify(incident),
  });
}

export async function deleteServerIncident(id: string, sku: string) {
  const code = await get<string>(`share_${sku}`);
  const userId = await ShareConnection.getUserId();

  if (!code) {
    return;
  }

  const url = new URL(`/api/share/${sku}/${code}/incident`, URL_BASE);
  url.searchParams.set("id", id);
  url.searchParams.set("user_id", userId);
  return fetch(url, {
    method: "DELETE",
  });
}

export class ShareConnection {
  ws: WebSocket | null = null;

  sku: string = "";
  code: string = "";

  user: ShareUser | null = null;
  owner: string | null = null;

  public setup(sku: string, code: string, user: Omit<ShareUser, "id">) {

    if (this.sku === sku && this.code === code) {
      return;
    }

    this.cleanup();

    this.sku = sku;
    this.code = code;

    return this.connect(user);
  }

  public static async getUserId() {
    const code = await get<string>("user_id");

    if (code) {
      return code;
    }

    const newCode = crypto.randomUUID();
    await set("user_id", newCode);

    return newCode;
  }

  async connect(user: Omit<ShareUser, "id">) {
    const id = await ShareConnection.getUserId();
    this.user = { id, ...user };

    const url = new URL(`/api/share/${this.sku}/${this.code}/join`, URL_BASE);

    if (url.protocol === "https:") {
      url.protocol = "wss:";
    } else {
      url.protocol = "ws:";
    }

    url.searchParams.set("id", id);
    url.searchParams.set("name", this.user.name);

    this.ws = new WebSocket(url);
    this.ws.onmessage = this.handleMessage.bind(this);
  }

  async send(message: WebSocketPeerMessage) {
    const payload: WebSocketPayload<WebSocketPeerMessage> = {
      ...message,
      sender: { type: "client", name: this.user?.name ?? "" },
      date: new Date().toISOString(),
    };
    this.ws?.send(JSON.stringify(payload));
  }

  private async handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data) as WebSocketPayload<WebSocketMessage>;
      switch (data.type) {
        case "add_incident": {
          const has = await hasIncident(data.incident.id);
          if (!has) {
            await newIncident(data.incident, false, data.incident.id);
          }
          break;
        }
        case "update_incident": {
          await setIncident(data.incident.id, data.incident);
          break;
        }
        case "remove_incident": {
          await deleteIncident(data.id, false);
          break;
        }

        // Sent when you first join, and also when owner changes. We definitely don't want to
        // *delete* incidents the user creates before joining the share.
        case "server_share_info": {
          this.owner = data.data.owner;

          for (const incident of data.data.incidents) {
            const has = await hasIncident(incident.id);
            if (!has) {
              await newIncident(incident, false, incident.id);
            }
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
          toast({ type: "info", message: `${data.user} joined.` });
          break;
        }
        case "server_user_remove": {
          toast({ type: "warn", message: `${data.user} left.` });
          break;
        }
        case "message": {
          const sender =
            data.sender.type === "server" ? "Server" : data.sender.name;
          toast({ type: "info", message: `${sender}: ${data.message}` });
          break;
        }
      }
    } catch (e) { }
  }

  public cleanup() {
    this.ws?.close();
  }
}
