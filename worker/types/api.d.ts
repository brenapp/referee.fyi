import { EventIncidents, ShareMetadata, Incident, ShareUser } from "./EventIncidents";

export * from "./EventIncidents";

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

// POST /api/:sku/create
export type APICreateRequestBody = {};
export type APICreateResponseBody = {
    invitation: string;
    admin: true
};

// GET /:sku/invitation
export type APIGetInvitationResponseBody = {
    invitation: string;
    admin: boolean;
}

// PUT /:sku/invite
export type APIPutInviteResponseBody = {};


// DELETE /:sku/invite
export type APIDeleteInviteResponseBody = {};


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


export type WebSocketSender = { type: "server" } | { type: "client", name: string, id: string }
export type WebSocketPayload<T extends WebSocketMessage> = T & {
    date: string; // ISO string
    sender: WebSocketSender;
}
