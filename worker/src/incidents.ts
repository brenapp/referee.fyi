import { Router } from "itty-router";
import { corsHeaders, response } from "./utils";
import type {
  ShareUser,
  Incident,
  EventIncidentsData as EventIncidentsData,
  WebSocketMessage,
  WebSocketPayload,
  WebSocketPeerMessage,
  WebSocketSender,
  WebSocketServerShareInfoMessage,
  EventIncidentsInitData,
  InvitationListItem,
} from "../types/api";
import { Env, Invitation, ShareInstance, User } from "../types/server";
import { getUser } from "./data";

export type SessionClient = {
  user: ShareUser;
  socket: WebSocket;
  ip: string;
  active: boolean;
};

export class EventIncidents implements DurableObject {
  router = Router();
  clients: SessionClient[] = [];
  state: DurableObjectState;

  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    this.router
      .post("/init", (r) => this.handleInit(r))
      .get("/join", (r) => this.handleWebsocket(r))
      .get("/get", () => this.handleGet())
      .get("/csv", () => this.handleCSV())
      .get("/json", () => this.handleJSON())
      .put("/incident", (r) => this.handleAddIncident(r))
      .patch("/incident", (r) => this.handleEditIncident(r))
      .delete("/incident", (r) => this.handleDeleteIncident(r))
      .all("*", () =>
        response({
          success: false,
          reason: "bad_request",
          details: "durable object unknown action",
        })
      );
  }

  // Storage
  async setSKU(sku: string) {
    await this.state.blockConcurrencyWhile(async () => {
      await this.state.storage.put("sku", sku);
    });
  }

  async getSKU() {
    return this.state.storage.get<string>("sku");
  }

  async setInstanceSecret(secret: string) {
    await this.state.blockConcurrencyWhile(async () => {
      await this.state.storage.put("instance_secret", secret);
    });
  }
  async getInstanceSecret() {
    return this.state.storage.get<string>("instance_secret");
  }

  async addIncident(incident: Incident) {
    await this.state.blockConcurrencyWhile(async () => {
      await this.state.storage.put(incident.id, incident);
      const list = (await this.state.storage.get<string[]>("incidents")) ?? [];
      await this.state.storage.put("incidents", [...list, incident.id]);
    });
  }

  async editIncident(incident: Incident) {
    return this.state.blockConcurrencyWhile(async () => {
      const current = await this.state.storage.get<Incident | undefined>(
        incident.id
      );

      if (!current) {
        return false;
      }

      await this.state.storage.put(incident.id, incident);
      return true;
    });
  }

  async deleteIncident(id: string) {
    return this.state.blockConcurrencyWhile(async () => {
      const list = (await this.state.storage.get<string[]>("incidents")) ?? [];
      const filtered = list.filter((value) => value !== id);
      await this.state.storage.put("incidents", filtered);

      const deletedIncidents =
        (await this.state.storage.get<string[]>("deleted_incidents")) ?? [];

      if (!deletedIncidents.includes(id)) {
        await this.state.storage.put("deleted_incidents", [
          ...deletedIncidents,
          id,
        ]);
      }

      return list.length !== filtered.length;
    });
  }

  async getIncident(id: string) {
    return this.state.storage.get<Incident>(id);
  }

  async getDeletedIncidents() {
    return (await this.state.storage.get<string[]>("deleted_incidents")) ?? [];
  }

  async getIncidentList() {
    return (await this.state.storage.get<string[]>("incidents")) ?? [];
  }

  async getAllIncidents(): Promise<Incident[]> {
    const ids = await this.getIncidentList();
    const incidents = await Promise.all(ids.map((id) => this.getIncident(id)));
    return incidents.filter((i) => !!i) as Incident[];
  }

  async getData(): Promise<EventIncidentsData> {
    const sku = await this.getSKU();
    const incidents = await this.getAllIncidents();
    const deleted = await this.getDeletedIncidents();

    return { sku: sku ?? "", incidents, deleted };
  }

  async createServerShareMessage(): Promise<WebSocketServerShareInfoMessage> {
    const data = await this.getData();
    const activeUsers = await this.getActiveUsers();
    const invitations = await this.getInvitationList();
    return {
      type: "server_share_info",
      activeUsers,
      invitations,
      data,
    };
  }

  createPayload<T extends WebSocketMessage = WebSocketMessage>(
    message: T,
    sender: WebSocketSender
  ): WebSocketPayload<T> {
    return { ...message, sender, date: new Date().toISOString() };
  }

  getRequestBody<T = unknown>(request: Request): T | null {
    const content = request.headers.get("X-Referee-Content");

    if (!content) {
      return null;
    }

    try {
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
  }

  getRequestUser(request: Request): User {
    const name = request.headers.get("X-Referee-User-Name") ?? "";
    const key = request.headers.get("X-Referee-User-Key") ?? "";

    return { name, key };
  }

  async getInstance(): Promise<ShareInstance | null> {
    const sku = await this.getSKU();
    const secret = await this.getInstanceSecret();

    const instance = await this.env.SHARES.get<ShareInstance>(
      `${sku}#${secret}`,
      "json"
    );
    return instance;
  }

  async getInvitationList(): Promise<InvitationListItem[]> {
    const sku = await this.getSKU();
    const instance = await this.getInstance();

    if (!instance) {
      return [];
    }

    const invitations: InvitationListItem[] = [];

    const users = instance.invitations.filter(
      (u, i) => instance.invitations.indexOf(u) === i
    );
    for (const user of users) {
      const invitation = await this.env.INVITATIONS.get<Invitation>(
        `${user}#${sku}`,
        "json"
      );
      const profile = await getUser(this.env, user);

      if (!invitation || !profile) {
        continue;
      }

      invitations.push({
        id: invitation.id,
        accepted: invitation.accepted,
        admin: invitation.admin,
        user: profile,
      });
    }

    return invitations;
  }

  async getActiveUsers(): Promise<ShareUser[]> {
    return this.clients
      .filter((client) => client.active)
      .map((client) => client.user);
  }

  async fetch(request: Request) {
    return this.router.handle(request);
  }

  async handleInit(request: Request) {
    const data = await request.json<EventIncidentsInitData>();

    await this.setInstanceSecret(data.instance);
    await this.setSKU(data.sku);

    return response({ success: true, data: null });
  }

  async handleGet() {
    const data = await this.createServerShareMessage();
    return response({
      success: true,
      data,
    });
  }

  async handleCSV() {
    const incidents = await this.getAllIncidents();

    let output = "Date,Time,ID,SKU,Division,Match,Team,Outcome,Rules,Notes\n";

    output += incidents
      .map((incident) => {
        const notes = incident.notes.replaceAll(/[\s\r\n]/g, " ");
        return [
          new Date(incident.time).toISOString(),
          new Date(incident.time).toISOString(),
          incident.id,
          incident.event,
          incident.division,
          incident.match?.name,
          incident.team,
          incident.outcome,
          incident.rules.join(" "),
          notes,
        ].join(",");
      })
      .join("\n");

    const response = new Response(output, { headers: corsHeaders });
    return response;
  }

  async handleJSON() {
    const incidents = await this.getAllIncidents();

    return response({
      success: true,
      data: incidents,
    });
  }

  async handleAddIncident(request: Request) {
    const user = this.getRequestUser(request);
    const client = this.clients.find((v) => v.user.id === user.key);

    const sender: WebSocketSender = client
      ? {
          type: "client",
          name: client.user.name,
          id: client.user.id,
        }
      : { type: "server" };

    const incident = this.getRequestBody<Incident>(request);

    if (!incident) {
      return response({
        success: false,
        reason: "bad_request",
        details: "Must specify a valid incident.",
      });
    }

    const deleted = await this.getDeletedIncidents();

    if (deleted.includes(incident.id)) {
      return response({
        success: false,
        reason: "bad_request",
        details: "That incident has been deleted.",
      });
    }

    await this.addIncident(incident);
    await this.broadcast({ type: "add_incident", incident }, sender);

    return response({
      success: true,
      data: incident,
    });
  }

  async handleEditIncident(request: Request): Promise<Response> {
    const incident = this.getRequestBody<Incident>(request);

    if (!incident) {
      return response({
        success: false,
        reason: "bad_request",
        details: "Must specify a valid incident to edit.",
      });
    }

    const deletedIncidents = await this.getDeletedIncidents();
    if (deletedIncidents.includes(incident.id)) {
      return response({
        success: false,
        reason: "bad_request",
        details: "That incident has been deleted.",
      });
    }

    const user = this.getRequestUser(request);
    const client = this.clients.find((v) => v.user.id === user.key);
    const currentIncident = await this.getIncident(incident.id);

    const sender: WebSocketSender = client
      ? {
          type: "client",
          name: client.user.name,
          id: client.user.id,
        }
      : { type: "server" };

    const currentRevision = currentIncident?.revision?.count ?? 0;
    if (incident.revision && incident.revision.count < currentRevision) {
      return response({
        success: false,
        reason: "bad_request",
        details: "The incident has been edited more recently.",
      });
    }

    if (!incident.revision) {
      incident.revision = {
        count: 1,
        user: sender,
        history: [],
      };
    }

    const success = await this.editIncident(incident);

    if (!success) {
      return response({
        success: false,
        reason: "bad_request",
        details: "Could not edit incident with that ID",
      });
    }

    await this.broadcast({ type: "update_incident", incident }, sender);

    return response({
      success: true,
      data: incident.revision,
    });
  }

  async handleDeleteIncident(request: Request) {
    const params = new URL(request.url).searchParams;
    const user = this.getRequestUser(request);
    const client = this.clients.find((v) => v.user.id === user.key);

    const sender: WebSocketSender = client
      ? {
          type: "client",
          name: client.user.name,
          id: client.user.id,
        }
      : { type: "server" };

    const id = params.get("id");

    if (!id) {
      return response({
        success: false,
        reason: "bad_request",
        details: "Must specify `id` of incident to delete",
      });
    }

    const success = await this.deleteIncident(id);

    if (!success) {
      return response({
        success: false,
        reason: "bad_request",
        details: "Could not find incident with that ID",
      });
    }

    this.broadcast({ type: "remove_incident", id }, sender);

    return response({
      success: true,
      data: {},
    });
  }

  async handleWebsocket(request: Request) {
    const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";

    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();

      const search = new URL(request.url).searchParams;

      const name = search.get("name");
      const id = search.get("id");

      if (!name || !id) {
        const socket = pair[1];
        socket.accept();

        socket.send(JSON.stringify({ error: "must specify name and user id" }));
        socket.close(1011, "Must specify name and user id");
        return new Response(null, { status: 101, webSocket: pair[0] });
      }

      this.handleSession(pair[1], ip, { name, id });
      return new Response(null, {
        status: 101,
        webSocket: pair[0],
        headers: corsHeaders,
      });
    }
  }

  async handleSession(socket: WebSocket, ip: string, user: ShareUser) {
    socket.accept();

    const client: SessionClient = { socket, ip, active: true, user };

    // Ensure that clients aren't  listed twice
    this.clients = this.clients.filter((c) => c.user.id !== user.id);
    this.clients.push(client);

    // Set event handlers to receive messages.
    socket.addEventListener("message", async (event: MessageEvent) => {
      try {
        if (!client.active) {
          socket.close(1011, "WebSocket broken.");
          return;
        }

        const data = JSON.parse(
          event.data as string
        ) as WebSocketPayload<WebSocketPeerMessage>;

        switch (data.type) {
          case "add_incident": {
            const incident = data.incident;
            await this.addIncident(incident);
            this.broadcast(
              { type: "add_incident", incident },
              { type: "client", name: client.user.name, id: client.user.id }
            );
            break;
          }
          case "update_incident": {
            const incident = data.incident;
            await this.editIncident(incident);
            this.broadcast(
              { type: "update_incident", incident },
              { type: "client", name: client.user.name, id: client.user.id }
            );
            break;
          }
          case "remove_incident": {
            await this.deleteIncident(data.id);
            this.broadcast(
              { type: "remove_incident", id: data.id },
              { type: "client", name: client.user.name, id: client.user.id }
            );
            break;
          }
          case "message": {
            this.broadcast(
              { type: "message", message: data.message },
              { type: "client", name: client.user.name, id: client.user.id }
            );
            break;
          }
        }
      } catch (err) {
        socket.send(JSON.stringify({ error: err }));
      }
    });

    const activeUsers = await this.getActiveUsers();
    const invitations = await this.getInvitationList();

    const state = await this.createServerShareMessage();
    const payload = this.createPayload(state, { type: "server" });

    await socket.send(JSON.stringify(payload));
    await this.broadcast(
      { type: "server_user_add", user, invitations, activeUsers },
      { type: "server" }
    );

    const quitHandler = async () => {
      client.active = false;
      this.clients = this.clients.filter((member) => member !== client);

      const activeUsers = await this.getActiveUsers();
      const invitations = await this.getInvitationList();

      if (client.user) {
        await this.broadcast(
          { type: "server_user_remove", user, invitations, activeUsers },
          { type: "server" }
        );
      }
    };

    socket.addEventListener("close", quitHandler);
    socket.addEventListener("error", quitHandler);
  }

  async broadcast<T extends WebSocketMessage>(
    message: T,
    sender: WebSocketSender
  ) {
    const payload: WebSocketPayload<T> = this.createPayload(message, sender);

    const clientLefts: SessionClient[] = [];

    this.clients = this.clients.filter((client) => {
      try {
        client.socket.send(JSON.stringify(payload));

        return true;
      } catch (err) {
        client.active = false;
        clientLefts.push(client);

        return false;
      }
    });

    const activeUsers = await this.getActiveUsers();
    const invitations = await this.getInvitationList();

    clientLefts.forEach((client) => {
      if (client.user) {
        this.broadcast(
          {
            type: "server_user_remove",
            user: client.user,
            activeUsers,
            invitations,
          },
          { type: "server" }
        );
      }
    });
  }

  async alarm() {
    await this.destroy();
  }

  async destroy() {
    await this.state.storage.deleteAll();
  }
}
