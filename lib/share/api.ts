import { ConsistentMap } from "@referee-fyi/consistency";
import type { Incident } from "./incident.js";
import type { MatchScratchpad } from "./index.js";
import { InvitationSchema } from "./server.js";
import type { Iso3166Alpha2Code } from "@cloudflare/workers-types";
import { z } from "zod/v4";

export const UserSchema = z
  .object({
    key: z.string(),
    name: z.string(),
  })
  .meta({
    id: "User",
    description: "A registered user",
  });

export type User = z.infer<typeof UserSchema>;

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

export const UserInvitationSchema = InvitationSchema.pick({
  id: true,
  admin: true,
  accepted: true,
  sku: true,
}).extend({
  from: UserSchema,
});

export type UserInvitation = z.infer<typeof UserInvitationSchema>;

// POST /api/user
export type APIRegisterUserResponseBody = {
  user: User;
  isSystemKey: boolean;
};

// PUT /api/:sku/request
export type APIPutInvitationRequestResponseBody = {
  code: string;
  ttl: number;
};

// GET /api/:sku/request?code=<CODE>
export type APIGetInvitationRequestResponseBody = {
  user: User;
  version: string;
};

// POST /api/:sku/create
export type APIPostCreateResponseBody = UserInvitation;

// GET /api/:sku/invitation
export type APIGetInvitationResponseBody = UserInvitation;

// PUT /api/:sku/accept
export type APIPutInvitationAcceptResponseBody = UserInvitation;

// GET /api/:sku/list
export type APIGetListShareInstance = {
  instances: string[];
};

// PUT /api/:sku/invite
export type APIPutInviteResponseBody = Record<string, never>;

// DELETE /api/:sku/invite
export type APIDeleteInviteResponseBody = Record<string, never>;

// GET /api/:sku/get
export type APIGetShareDataResponseBody = WebSocketServerShareInfoMessage;

// PUT /api/:sku/incident
export type APIPutIncidentResponseBody = Incident;

// PATCH /api/:sku/incident
export type APIPatchIncidentResponseBody = Incident;

// DELETE /api/:sku/incident
export type APIDeleteIncidentResponseBody = Record<string, never>;

// GET /api/:sku/asset/upload_url
export type APIGetAssetUploadURLResponseBody = {
  uploadURL: string;
};

// GET /api/:sku/asset/:id/preview_url
export type ApiGetAssetPreviewURLResponseBody = {
  owner: string;
  previewURL: string;
};

// GET /api/:sku/asset/:id/url
export type ApiGetAssetOriginalURLResponseBody = {
  owner: string;
  url: string;
};

export type ApiGetMetaLocationResponseBody = {
  location: {
    city: string;
    colo: string;
    region: string;
    country: string;
    country_code: Iso3166Alpha2Code;
    postcode: string;
    continent: string;
  } | null;
};

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

export type WebSocketUpdateScratchpadMessage = {
  type: "scratchpad_update";
  id: string;
  scratchpad: MatchScratchpad;
};

export type WebSocketBroadcastMessage = {
  type: "message";
  message: string;
};

export type WebSocketPeerMessage =
  | WebSocketAddIncidentMessage
  | WebSocketUpdateIncidentMessage
  | WebSocketRemoveIncidentMessage
  | WebSocketUpdateScratchpadMessage
  | WebSocketBroadcastMessage;

export const InvitationListItemSchema = z
  .object({
    admin: z.boolean(),
    user: UserSchema,
  })
  .meta({
    id: "InvitationListItem",
    description: "Represents a user who has access to a shared instance.",
  });

export type InvitationListItem = z.infer<typeof InvitationListItemSchema>;

export type InstanceIncidents = ConsistentMap<Incident>;
export type InstanceScratchpads = ConsistentMap<MatchScratchpad>;

export type WebSocketServerShareInfoMessage = {
  type: "server_share_info";
  sku: string;
  incidents: InstanceIncidents;
  scratchpads: InstanceScratchpads;
  users: {
    active: User[];
    invitations: InvitationListItem[];
  };
};

export type WebsocketServerUserAddMessage = {
  type: "server_user_add";
  user: User;
  activeUsers: User[];
  invitations: InvitationListItem[];
};

export type WebsocketServerUserRemoveMessage = {
  type: "server_user_remove";
  user: User;
  activeUsers: User[];
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
