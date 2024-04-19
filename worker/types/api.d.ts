import { EventIncidentsData, Incident, ShareUser } from "./EventIncidents";
import { Invitation, User } from "./server";

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

export type UserInvitation = Pick<
  Invitation,
  "id" | "admin" | "accepted" | "sku"
> & {
  from: User;
};

// POST /api/user
export type APIRegisterUserResponseBody = {
  user: User;
};

// PUT /api/:sku/request
export type APIPutInvitationRequestResponseBody = {
  code: string;
  ttl: number;
};

// GET /api/:sku/request?code=<CODE>
export type APIGetInvitationRequestResponseBody = {
  user: User;
};

// POST /api/:sku/create
export type APIPostCreateResponseBody = UserInvitation;

// GET /api/:sku/invitation
export type APIGetInvitationResponseBody = UserInvitation;

// PUT /api/:sku/accept
export type APIPutInvitationAcceptResponseBody = UserInvitation;

// PUT /api/:sku/invite
export type APIPutInviteResponseBody = Record<string, never>;

// DELETE /api/:sku/invite
export type APIDeleteInviteResponseBody = Record<string, never>;

// GET /api/:sku/get
export type APIGetShareDataResponseBody = WebSocketServerShareInfoMessage;

// PUT /api/:sku/incident
export type APIPutIncidentResponseBody = Incident;

// PATCH /api/:sku/incident
export type APIPatchIncidentResponseBody = Incident["revision"];

// DELETE /api/:sku/incident
export type APIDeleteIncidentResponseBody = Record<string, never>;

// WebSocket communications

export type WebSocketAddIncidentMessage = {
  type: "add_incident";
  incident: Incident;
};

export type WebSocketUpdateIncidentMessage = {
  type: "update_incident";
  incident: Incident;
};

export type WebSocketRemoveIncidentMessage = {
  type: "remove_incident";
  id: string;
};

export type WebSocketBroadcastMessage = {
  type: "message";
  message: string;
};

export type WebSocketPeerMessage =
  | WebSocketAddIncidentMessage
  | WebSocketUpdateIncidentMessage
  | WebSocketRemoveIncidentMessage
  | WebSocketBroadcastMessage;

export type InvitationListItem = Pick<Invitation, "admin"> & {
  user: User;
};

export type WebSocketServerShareInfoMessage = {
  type: "server_share_info";
  data: EventIncidentsData;
  activeUsers: ShareUser[];
  invitations: InvitationListItem[];
};

export type WebsocketServerUserAddMessage = {
  type: "server_user_add";
  user: ShareUser;
  activeUsers: ShareUser[];
  invitations: InvitationListItem[];
};

export type WebsocketServerUserRemoveMessage = {
  type: "server_user_remove";
  user: ShareUser;
  activeUsers: ShareUser[];
  invitations: InvitationListItem[];
};

export type WebSocketServerMessage =
  | WebSocketServerShareInfoMessage
  | WebsocketServerUserAddMessage
  | WebsocketServerUserRemoveMessage;

export type WebSocketMessage = WebSocketPeerMessage | WebSocketServerMessage;

export type WebSocketMessageData = {
  [T in WebSocketMessage["type"]]: Omit<WebSocketMessage & { type: T }, "type">;
};

export type WebSocketSender =
  | { type: "server" }
  | { type: "client"; name: string; id: string };
export type WebSocketPayload<T extends WebSocketMessage> = T & {
  date: string; // ISO string
  sender: WebSocketSender;
};
