import { EventIncidents, ShareMetadata, Incident, ShareUser } from "./EventIncidents";

export * from "./EventIncidents";
export * from "./MatchNotes";

export type ShareResponseSuccess<T> = {
    success: true;
    data: T;
};

export type ShareResponseFailureReason =
    | "bad_request"
    | "server_error"
    | "incorrect_code";

export type ShareResponseFailure = {
    success: false;
    reason: ShareResponseFailureReason;
    details: string;
};

export type ShareResponse<T> = ShareResponseSuccess<T> | ShareResponseFailure;

// /api/create/:sku
export type CreateShareRequest = Omit<ShareMetadata, "code">;
export type CreateShareResponse = Pick<ShareMetadata, "code">

// PATCH /api/share/:sku:/:code:/incident
export type EditIncidentResponse = Exclude<Incident["revision"], undefined>;
export type ShareGetDataResponse = WebSocketMessageData["server_share_info"];

// WebSocket communications

export type WebSocketAddIncidentMessage = {
    type: "add_incident";
    incident: Incident;
}

export type WebSocketUpdateIncidentMessage = {
    type: "update_incident";
    incident: Incident;
}

export type WebSocketRemoveIncidentMessage = {
    type: "remove_incident";
    id: string;
}

export type WebSocketBroadcastMessage = {
    type: "message";
    message: string;
}

export type WebSocketPeerMessage =
    WebSocketAddIncidentMessage |
    WebSocketUpdateIncidentMessage |
    WebSocketRemoveIncidentMessage |
    WebSocketBroadcastMessage;

export type WebSocketServerShareInfoMessage = {
    type: "server_share_info",
    data: Omit<EventIncidents, "owner"> & { owner: string };
    users: ShareUser["name"][]
}

export type WebsocketServerUserAddMessage = {
    type: "server_user_add";
    user: ShareUser["name"];
}

export type WebsocketServerUserRemoveMessage = {
    type: "server_user_remove";
    user: ShareUser["name"];
}

export type WebSocketServerMessage =
    WebSocketServerShareInfoMessage |
    WebsocketServerUserAddMessage |
    WebsocketServerUserRemoveMessage;

export type WebSocketMessage = WebSocketPeerMessage | WebSocketServerMessage;

export type WebSocketMessageData = {
    [T in WebSocketMessage["type"]]: Omit<WebSocketMessage & { type: T }, "type">
};


export type WebSocketSender = { type: "server" } | { type: "client", name: string }
export type WebSocketPayload<T extends WebSocketMessage> = T & {
    date: string; // ISO string
    sender: WebSocketSender;
}
