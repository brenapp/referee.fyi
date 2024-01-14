import { get, set } from "idb-keyval";
import type { ShareResponse, CreateShareResponse, EventIncidents, ShareUser, WebSocketPayload, WebSocketMessage, WebSocketPeerMessage } from "~share/api";
import { deleteIncident, getIncidentsByEvent, hasIncident, newIncident, setIncident } from "./incident";
import { toast } from "~components/Toast";

const URL_BASE = import.meta.env.DEV ? "http://localhost:8787" : "";

export async function createShare(incidents: EventIncidents): Promise<ShareResponse<CreateShareResponse>> {
  try {
    const response = await fetch(new URL(`/api/share/${incidents.sku}`, URL_BASE), {
      method: "POST",
      body: JSON.stringify(incidents)
    });
    return response.json();
  } catch (e) {
    return {
      success: false,
      reason: "bad_request",
      details: `${e}`
    }
  };
};

export async function canJoinShare(sku: string, code: string) {
  const url = new URL(`/api/share/${sku}/${code}/get`, URL_BASE);
  try {
    const resp = await fetch(url);
    if (resp.ok) {
      return true;
    } else {
      return false;
    }
  } catch (e) {
    return false;
  }
};


export class ShareConnection {
  ws: WebSocket | null = null;

  sku: string;
  code: string;

  user: ShareUser | null = null;
  owner: string | null = null;

  constructor(sku: string, code: string) {
    this.sku = sku;
    this.code = code;
  }

  public static async getUserId() {
    const code = await get<string>("user_id");

    if (code) {
      return code;
    }

    const newCode = crypto.randomUUID();
    await set("user_id", newCode);

    return newCode;
  };

  async connect(user: Omit<ShareUser, "id">) {
    const id = await ShareConnection.getUserId();
    this.user = { id, ...user };

    const url = new URL(`/api/share/${this.sku}/${this.code}/join`, URL_BASE);

    url.searchParams.set("id", id);
    url.searchParams.set("name", this.user.name);

    this.ws = new WebSocket(url);
    this.ws.onmessage = this.handleMessage.bind(this);
  };

  async send(message: WebSocketPeerMessage) {
    const payload: WebSocketPayload<WebSocketPeerMessage> = { ...message, sender: { type: "client", name: this.user?.name ?? "" }, date: new Date().toISOString() };
    this.ws?.send(JSON.stringify(payload));
  };

  private async handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data) as WebSocketPayload<WebSocketMessage>
      switch (data.type) {
        case "add_incident": {
          await newIncident(data.incident, false, data.incident.id)
          break;
        }
        case "update_incident": {
          await setIncident(data.incident.id, data.incident)
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
              await newIncident(incident, false, incident.id)
            }
          }

          const eventIncidents = await getIncidentsByEvent(this.sku);
          const localOnly = eventIncidents.filter(local => data.data.incidents.every(remote => local.id !== remote.id));

          for (const incident of localOnly) {
            await this.send({ type: "add_incident", incident });
          };

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
          const sender = data.sender.type === "server" ? "Server" : data.sender.name;
          toast({ type: "info", message: `${sender}: ${data.message}` })
          break;
        }
      }
    } catch (e) {

    }
  }

  public cleanup() {
    this.ws?.close();
  };
};