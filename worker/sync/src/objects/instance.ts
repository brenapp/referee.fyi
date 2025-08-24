import {
  type Incident,
  type WebSocketMessage,
  type WebSocketPayload,
  type WebSocketPeerMessage,
  type WebSocketSender,
  type WebSocketServerShareInfoMessage,
  type InvitationListItem,
  type MatchScratchpad,
  type ShareInstanceMeta as ShareInstanceMeta,
  type User,
  type InstanceIncidents,
  type InstanceScratchpads,
  WebSocketMessageSchema,
} from "@referee-fyi/share";
import { getUser } from "../utils/data";
import { DurableObject } from "cloudflare:workers";

export type ClientSession = {
  active: boolean;
  user: User;
};

export type ShareInstanceInitData = {
  instance: string;
  sku: string;
};

export class ShareInstance extends DurableObject {
  // User Key -> WebSocket
  sockets: Map<string, WebSocket> = new Map();

  // WebSocket -> Session
  sessions: Map<WebSocket, ClientSession> = new Map();

  state: DurableObjectState;

  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.env = env;

    // Restore sockets
    this.ctx.getWebSockets().forEach((ws) => {
      const attachment: ClientSession = ws.deserializeAttachment();
      if (attachment) {
        this.sessions.set(ws, { ...attachment });
        this.sockets.set(attachment.user.key, ws);
      }
    });
  }

  // Storage
  KEYS = {
    incident: (id: string) => `incident#${id}`,
    deletedIncident: (id: string) => `deleted_incidents#${id}`,
    scratchpad: (id: string) => `scratchpad#${id}`,
    sku: "meta#sku",
    secret: "meta#instance_secret",
  };

  async setSKU(sku: string): Promise<void> {
    return this.state.storage.put(this.KEYS.sku, sku);
  }

  async getSKU(): Promise<string | undefined> {
    return this.state.storage.get<string>(this.KEYS.sku);
  }

  async setInstanceSecret(secret: string): Promise<void> {
    return this.state.storage.put(this.KEYS.secret, secret);
  }
  async getInstanceSecret(): Promise<string | undefined> {
    return this.state.storage.get<string>(this.KEYS.secret);
  }

  async getScratchpad(id: string): Promise<MatchScratchpad | undefined> {
    return this.state.storage.get<MatchScratchpad>(this.KEYS.scratchpad(id));
  }

  async setScratchpad(id: string, scratchpad: MatchScratchpad): Promise<void> {
    return this.state.storage.put(this.KEYS.scratchpad(id), scratchpad);
  }

  async getAllScratchpads(): Promise<MatchScratchpad[]> {
    const prefix = this.KEYS.scratchpad("");
    const map = await this.state.storage.list<MatchScratchpad>({
      prefix,
    });

    return [...map.values()];
  }

  async addIncident(incident: Incident): Promise<void> {
    return this.state.storage.put(this.KEYS.incident(incident.id), incident);
  }

  async editIncident(incident: Incident): Promise<void> {
    return this.state.storage.put(this.KEYS.incident(incident.id), incident);
  }

  async deleteIncident(id: string): Promise<void> {
    return this.state.storage.put(this.KEYS.deletedIncident(id), true);
  }

  async getIncident(id: string): Promise<Incident | undefined> {
    return this.state.storage.get<Incident>(this.KEYS.incident(id));
  }

  async getDeletedIncidents(): Promise<Set<string>> {
    const prefix = this.KEYS.deletedIncident("");
    const map = await this.state.storage.list<boolean>({
      prefix,
    });
    return new Set(map.keys().map((k) => k.slice(prefix.length)));
  }

  /**
   * @returns All incidents in the instance.
   */
  async getAllIncidents(): Promise<Incident[]> {
    const prefix = this.KEYS.incident("");
    const map = await this.state.storage.list<Incident>({
      prefix,
    });

    const deleted = await this.getDeletedIncidents();
    return [...map.values()].filter((i) => !deleted.has(i.id));
  }

  /**
   * @returns All incidents data in the instance.
   **/
  async getIncidentsData(): Promise<InstanceIncidents> {
    const incidents = await this.getAllIncidents();
    const deleted = await this.getDeletedIncidents();

    return {
      values: Object.fromEntries(incidents.map((i) => [i.id, i])),
      deleted: [...deleted.keys()],
    };
  }

  /**
   * @returns All scratchpads data in the instance.
   */
  async getScratchpadData(): Promise<InstanceScratchpads> {
    const values = await this.getAllScratchpads();
    return {
      deleted: [],
      values: Object.fromEntries(values.map((s) => [s.id, s])),
    };
  }

  /**
   * Creates information for the server_share_info message.
   **/
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

  /**
   * Returns information about the share instance.
   * @returns
   */
  async getInstance(): Promise<ShareInstanceMeta | null> {
    const sku = await this.getSKU();
    const secret = await this.getInstanceSecret();

    const instance = await this.env.SHARES.get<ShareInstanceMeta>(
      `${sku}#${secret}`,
      "json"
    );
    return instance;
  }

  /**
   * @returns A list of invitations in the instance.
   **/
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

  /**
   * @returns Active users in the instance
   **/
  getActiveUsers(): User[] {
    return [...this.sessions].map(([, session]) => session.user);
  }

  /**
   * Call when you first construct the DO
   * @param data
   **/
  async init(data: ShareInstanceInitData): Promise<void> {
    await this.setInstanceSecret(data.instance);
    await this.setSKU(data.sku);
  }

  /**
   * Accepts a websocket connection and handles the session.
   * @param request
   **/
  async fetch(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    const search = new URL(request.url).searchParams;
    const name = search.get("name");
    const key = search.get("id");

    if (!name || !key) {
      const socket = server;
      socket.accept();

      socket.send(JSON.stringify({ error: "must specify name and user id" }));
      socket.close(1011, "Must specify name and user id");
      return new Response(null, { status: 101, webSocket: client });
    }

    const user: User = { name, key };
    const session: ClientSession = {
      active: true,
      user,
    };

    const current = this.sockets.get(user.key);
    if (current) {
      const payload = this.createPayload(
        { type: "message", message: "Replaced by new connection" },
        { type: "server" }
      );
      current.send(JSON.stringify(payload));
      current.close(1011, "Replaced by new connection.");
      this.sessions.delete(current);
    }

    console.log("this.sockets", user.key, this.sockets);
    console.log("this.sessions", server, this.sessions);

    this.sockets.set(user.key, server);
    this.sessions.set(server, session);

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(session);

    const activeUsers = this.getActiveUsers();
    const invitations = await this.getInvitationList();

    await this.broadcast(
      { type: "server_user_add", user, invitations, activeUsers },
      { type: "server" }
    );

    const state = await this.createServerShareMessage();
    const payload = this.createPayload(state, { type: "server" });
    server.send(JSON.stringify(payload));

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer
  ): Promise<void> {
    try {
      const string =
        typeof message === "string"
          ? message
          : new TextDecoder().decode(message);
      const result = WebSocketMessageSchema.safeParse(JSON.parse(string));

      if (!result.success) {
        const payload = this.createPayload(
          {
            type: "server_error",
            error: `Invalid message format: ${result.error.message}`,
          },
          { type: "server" }
        );
        ws.send(JSON.stringify(payload));
        return;
      }

      const session = this.sessions.get(ws);
      console.log("sessions: ", this.sessions);
      if (!session) {
        const payload = this.createPayload(
          {
            type: "server_error",
            error: "WebSocket not associated with a user.",
          },
          { type: "server" }
        );
        ws.send(JSON.stringify(payload));
        ws.close(1011, "WebSocket not associated with a user.");
        return;
      }

      const data = result.data as WebSocketPeerMessage;
      switch (data.type) {
        case "add_incident": {
          const incident = data.incident as Incident;
          await this.addIncident(incident);
          this.broadcast(
            { type: "add_incident", incident },
            { type: "client", name: session.user.name, id: session.user.key }
          );
          break;
        }
        case "update_incident": {
          const incident = data.incident as Incident;
          await this.editIncident(incident);
          this.broadcast(
            { type: "update_incident", incident },
            { type: "client", name: session.user.name, id: session.user.key }
          );
          break;
        }
        case "remove_incident": {
          await this.deleteIncident(data.id);
          this.broadcast(
            { type: "remove_incident", id: data.id },
            { type: "client", name: session.user.name, id: session.user.key }
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
            { type: "client", name: session.user.name, id: session.user.key }
          );
          break;
        }
        case "message": {
          this.broadcast(
            { type: "message", message: data.message },
            { type: "client", name: session.user.name, id: session.user.key }
          );
          break;
        }
      }
    } catch (e) {
      const payload = this.createPayload(
        {
          type: "server_error",
          error: `${e}`,
        },
        { type: "server" }
      );

      ws.send(JSON.stringify(payload));
      return;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const session = this.sessions.get(ws);
    if (!session) {
      return;
    }

    this.sockets.delete(session.user.key);
    this.sessions.delete(ws);

    const activeUsers = this.getActiveUsers();
    const invitations = await this.getInvitationList();

    if (session.user) {
      await this.broadcast(
        {
          type: "server_user_remove",
          user: session.user,
          activeUsers,
          invitations,
        },
        { type: "server" }
      );
    }
  }

  async webSocketError(ws: WebSocket /*error: unknown*/): Promise<void> {
    const session = this.sessions.get(ws);
    if (!session) {
      return;
    }

    this.sockets.delete(session.user.key);
    this.sessions.delete(ws);

    const activeUsers = this.getActiveUsers();
    const invitations = await this.getInvitationList();

    if (session.user) {
      await this.broadcast(
        {
          type: "server_user_remove",
          user: session.user,
          activeUsers,
          invitations,
        },
        { type: "server" }
      );
    }
  }

  async broadcast<T extends WebSocketMessage>(
    message: T,
    sender: WebSocketSender
  ) {
    const payload: WebSocketPayload<T> = this.createPayload(message, sender);

    const clientLefts: ClientSession[] = [];

    for (const [key, socket] of this.sockets) {
      try {
        socket.send(JSON.stringify(payload));
      } catch (err) {
        const session = this.sessions.get(socket);
        if (session) {
          clientLefts.push(session);
        }
        this.sockets.delete(key);
        this.sessions.delete(socket);
      }
    }

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
