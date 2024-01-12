import { EventIncidents, Incident, ShareUser } from "./EventIncidents";

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

// /api/create/:sku
export type CreateShareRequest = EventIncidents;

export type CreateShareResponse = {
    code: string;
}

export type WebSocketMessageData = {
    [T in WebSocketMessage["type"]]: Omit<WebSocketMessage & { type: T }, "type">
}

// WebSocket communications
export type WebSocketPeerMessage = {
    type: "add_incident" | "update_incident",
    incident: Incident;
} | {
    type: "remove_incident";
    id: string;
} | {
    type: "message";
    message: string;
}

export type WebSocketServerMessage = {
    type: "server_share_info";
    data: Omit<EventIncidents, "owner"> & { owner: string };
    users: ShareUser["name"][]
} | {
    type: "server_user_add";
    user: ShareUser["name"];
} | {
    type: "server_user_remove";
    user: ShareUser["name"];
}

export type WebSocketMessage = WebSocketPeerMessage | WebSocketServerMessage;

export type WebSocketSender = { type: "server" } | { type: "client", name: string }

export type WebSocketPayload<T extends WebSocketMessage> = T & {
    date: string; // ISO string
    sender: WebSocketSender;
}