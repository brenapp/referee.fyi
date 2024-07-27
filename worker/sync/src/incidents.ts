import { AutoRouter, cors, createResponse } from "itty-router";
import { response } from "./utils";
import {
  type Incident,
  type WebSocketMessage,
  type WebSocketPayload,
  type WebSocketPeerMessage,
  type WebSocketSender,
  type WebSocketServerShareInfoMessage,
  type InvitationListItem,
  type IncidentMatch,
  type MatchScratchpad,
  type ShareInstance,
  type User,
  type InstanceIncidents,
  type InstanceScratchpads,
  INCIDENT_IGNORE,
} from "@referee-fyi/share";
import { getUser } from "./data";
import { Env, EventIncidentsInitData, RequestHasInvitation } from "./types";
import { mergeLWW } from "@referee-fyi/consistency";
import { DurableObject } from "cloudflare:workers";

export type SessionClient = {
  user: User;
  socket: WebSocket;
  ip: string;
  active: boolean;
};

export function matchToString(match: IncidentMatch) {
  switch (match.type) {
    case "match": {
      return match.name;
    }
    case "skills": {
      const display: Record<typeof match.skillsType, string> = {
        programming: "Auto",
        driver: "Driver",
      };
      return `${display[match.skillsType]} Skills ${match.attempt}`;
    }
  }
}

const { preflight, corsify } = cors();
export class EventIncidents extends DurableObject {
  router = AutoRouter({
    before: [preflight],
    finally: [corsify],
  });
  clients: SessionClient[] = [];
  state: DurableObjectState;

  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.env = env;

    this.router
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

  async getScratchpad(id: string) {
    return this.state.storage.get<MatchScratchpad>(`scratchpad_${id}`);
  }

  async setScratchpad(id: string, scratchpad: MatchScratchpad) {
    const list =
      (await this.state.storage.get<Set<string>>(`scratchpads`)) ?? new Set();
    list.add(id);
    await this.state.storage.put(`scratchpads`, list);

    return this.state.storage.put<MatchScratchpad>(
      `scratchpad_${id}`,
      scratchpad
    );
  }

  async getAllScratchpads(): Promise<Record<string, MatchScratchpad>> {
    const listSet =
      (await this.state.storage.get<Set<string>>(`scratchpads`)) ?? new Set();

    const list = [...listSet];

    const bulkOps = this.groupIds(list, 128);
    const result = await Promise.all(
      bulkOps.map((ids) => this.state.storage.get<MatchScratchpad>(ids))
    );

    const scratchpads = Object.fromEntries(
      result.flatMap((r) => [...r.entries()])
    );

    return scratchpads;
  }

  async addIncident(incident: Incident) {
    await this.state.blockConcurrencyWhile(async () => {
      await this.state.storage.put(incident.id, incident);

      const list = (await this.state.storage.get<string[]>("incidents")) ?? [];

      if (!list.includes(incident.id)) {
        list.push(incident.id);
      }

      await this.state.storage.put("incidents", list);
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

      const deletedIncidents = await this.getDeletedIncidents();

      if (!deletedIncidents.has(id)) {
        deletedIncidents.add(id);
        await this.state.storage.put("deleted_incidents", deletedIncidents);
      }

      return list.length !== filtered.length;
    });
  }

  async getIncident(id: string) {
    return this.state.storage.get<Incident>(id);
  }

  async getDeletedIncidents() {
    const value = await this.state.storage.get<Set<string> | string[]>(
      "deleted_incidents"
    );
    return new Set(value);
  }

  async getIncidentList() {
    return (await this.state.storage.get<string[]>("incidents")) ?? [];
  }

  private groupIds(ids: string[], size: number): string[][] {
    const chunkCount = Math.ceil(ids.length / size);
    const chunks: string[][] = new Array(chunkCount);

    for (let i = 0, j = 0, k = size; i < chunkCount; ++i) {
      chunks[i] = ids.slice(j, k);
      j = k;
      k += size;
    }

    return chunks;
  }

  async getAllIncidents(): Promise<Incident[]> {
    const ids = await this.getIncidentList();

    // Bulk get only supports up to 128
    const bulkOps = this.groupIds(ids, 128);
    const result = await Promise.all(
      bulkOps.map((ids) => this.state.storage.get<Incident>(ids))
    );

    const incidents = result.map((map) => [...map.values()]).flat();
    return incidents;
  }

  async getIncidentsData(): Promise<InstanceIncidents> {
    const incidents = await this.getAllIncidents();
    const deleted = await this.getDeletedIncidents();

    return {
      values: Object.fromEntries(incidents.map((i) => [i.id, i])),
      deleted: [...deleted.keys()],
    };
  }

  async getScratchpadData(): Promise<InstanceScratchpads> {
    const values = await this.getAllScratchpads();
    return { deleted: [], values };
  }

  async createServerShareMessage(): Promise<WebSocketServerShareInfoMessage> {
    const sku = await this.getSKU();
    const incidents = await this.getIncidentsData();
    const scratchpads = await this.getScratchpadData();
    const activeUsers = this.getActiveUsers();
    const invitations = await this.getInvitationList();
    return {
      type: "server_share_info",
      sku: sku ?? "",
      incidents,
      scratchpads,
      users: {
        active: activeUsers,
        invitations,
      },
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
    const instance = await this.getInstance();

    if (!instance) {
      return [];
    }

    const users = instance.invitations.filter(
      (u, i) => instance.invitations.indexOf(u) === i
    );

    const invitations: InvitationListItem[] = await Promise.all(
      users.map(async (key) => {
        const user = await getUser(this.env, key);

        return {
          user: user ?? { key, name: "<Unknown User>" },
          admin: instance.admins.includes(key),
        };
      })
    );

    return invitations;
  }

  getActiveUsers(): User[] {
    return this.clients
      .filter((client) => client.active)
      .map((client) => client.user);
  }

  async handle(request: RequestHasInvitation) {
    return this.router.fetch(request);
  }

  async fetch(request: Request) {
    return this.router.fetch(request);
  }

  async init(data: EventIncidentsInitData) {
    await this.setInstanceSecret(data.instance);
    await this.setSKU(data.sku);
  }

  async handleGet() {
    const data = await this.createServerShareMessage();
    return response({
      success: true,
      data,
    });
  }

  csv = createResponse("text/csv");

  async handleCSV() {
    const incidents = await this.getAllIncidents();

    let output = "Date,Time,ID,SKU,Division,Match,Team,Outcome,Rules,Notes\n";

    output += incidents
      .map((incident) => {
        const notes = incident.notes.replaceAll(/[\s\r\n]/g, " ");

        const division =
          incident.match?.type === "match" ? incident.match.division : "";

        return [
          new Date(incident.time).toISOString(),
          new Date(incident.time).toISOString(),
          incident.id,
          incident.event,
          division,
          incident.match ? matchToString(incident.match) : "",
          incident.team,
          incident.outcome,
          incident.rules.join(" "),
          notes,
        ].join(",");
      })
      .join("\n");

    return this.csv(output);
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
    const client = this.clients.find((v) => v.user.key === user.key);

    const sender: WebSocketSender = client
      ? {
          type: "client",
          name: client.user.name,
          id: client.user.key,
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

    if (deleted.has(incident.id)) {
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
    if (deletedIncidents.has(incident.id)) {
      return response({
        success: false,
        reason: "bad_request",
        details: "That incident has been deleted.",
      });
    }

    const user = this.getRequestUser(request);
    const client = this.clients.find((v) => v.user.key === user.key);
    const currentIncident = await this.getIncident(incident.id);

    const result = mergeLWW({
      local: currentIncident,
      remote: incident,
      ignore: INCIDENT_IGNORE,
    });

    if (!result.resolved) {
      return response({
        success: false,
        reason: "bad_request",
        details: "Could not edit incident with that ID",
      });
    }

    const success = await this.editIncident(result.resolved);

    const sender: WebSocketSender = client
      ? {
          type: "client",
          name: client.user.name,
          id: client.user.key,
        }
      : { type: "server" };

    if (!success) {
      return response({
        success: false,
        reason: "bad_request",
        details: "Could not edit incident with that ID",
      });
    }

    await this.broadcast(
      { type: "update_incident", incident: result.resolved },
      sender
    );

    return response({
      success: true,
      data: incident,
    });
  }

  async handleDeleteIncident(request: Request) {
    const params = new URL(request.url).searchParams;
    const user = this.getRequestUser(request);
    const client = this.clients.find((v) => v.user.key === user.key);

    const sender: WebSocketSender = client
      ? {
          type: "client",
          name: client.user.name,
          id: client.user.key,
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
      const key = search.get("id");

      if (!name || !key) {
        const socket = pair[1];
        socket.accept();

        socket.send(JSON.stringify({ error: "must specify name and user id" }));
        socket.close(1011, "Must specify name and user id");
        return new Response(null, { status: 101, webSocket: pair[0] });
      }

      this.handleSession(pair[1], ip, { name, key });
      return new Response(null, {
        status: 101,
        webSocket: pair[0],
      });
    }
  }

  async handleSession(socket: WebSocket, ip: string, user: User) {
    socket.accept();

    const client: SessionClient = { socket, ip, active: true, user };

    // Ensure that clients aren't  listed twice
    this.clients = this.clients.filter((c) => c.user.key !== user.key);
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
              { type: "client", name: client.user.name, id: client.user.key }
            );
            break;
          }
          case "update_incident": {
            const incident = data.incident;
            await this.editIncident(incident);
            this.broadcast(
              { type: "update_incident", incident },
              { type: "client", name: client.user.name, id: client.user.key }
            );
            break;
          }
          case "remove_incident": {
            await this.deleteIncident(data.id);
            this.broadcast(
              { type: "remove_incident", id: data.id },
              { type: "client", name: client.user.name, id: client.user.key }
            );
            break;
          }
          case "scratchpad_update": {
            await this.setScratchpad(data.id, data.scratchpad);
            this.broadcast(
              {
                type: "scratchpad_update",
                id: data.id,
                scratchpad: data.scratchpad,
              },
              { type: "client", name: client.user.name, id: client.user.key }
            );
            break;
          }
          case "message": {
            this.broadcast(
              { type: "message", message: data.message },
              { type: "client", name: client.user.name, id: client.user.key }
            );
            break;
          }
        }
      } catch (err) {
        socket.send(JSON.stringify({ error: err }));
      }
    });

    const activeUsers = this.getActiveUsers();
    const invitations = await this.getInvitationList();

    await this.broadcast(
      { type: "server_user_add", user, invitations, activeUsers },
      { type: "server" }
    );

    const state = await this.createServerShareMessage();
    const payload = this.createPayload(state, { type: "server" });
    socket.send(JSON.stringify(payload));

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

    const activeUsers = this.getActiveUsers();
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
