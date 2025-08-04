import { ConsistentMap, ConsistentMapSchema } from "@referee-fyi/consistency";
import { IncidentSchema, type Incident } from "./incident.js";
import { MatchScratchpadSchema, type MatchScratchpad } from "./index.js";
import { InvitationSchema } from "./server.js";
import { z, ZodType } from "zod/v4";

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

export const InstanceIncidentsSchema = ConsistentMapSchema(IncidentSchema);
export type InstanceIncidents = ConsistentMap<Incident>;

export const InstanceScratchpadSchema = ConsistentMapSchema(
  MatchScratchpadSchema
);
export type InstanceScratchpads = ConsistentMap<MatchScratchpad>;

// WebSocket communications

export const WebSocketAddIncidentMessageSchema = z.object({
  type: z.literal("add_incident"),
  incident: IncidentSchema,
});

export const WebSocketUpdateIncidentMessageSchema = z.object({
  type: z.literal("update_incident"),
  incident: IncidentSchema,
});

export const WebSocketRemoveIncidentMessageSchema = z.object({
  type: z.literal("remove_incident"),
  id: z.string(),
});

export const WebSocketUpdateScratchpadMessageSchema = z.object({
  type: z.literal("scratchpad_update"),
  id: z.string(),
  scratchpad: MatchScratchpadSchema,
});

export const WebSocketBroadcastMessageSchema = z.object({
  type: z.literal("message"),
  message: z.string(),
});

export const WebSocketPeerMessageSchema = z.discriminatedUnion("type", [
  WebSocketAddIncidentMessageSchema,
  WebSocketUpdateIncidentMessageSchema,
  WebSocketRemoveIncidentMessageSchema,
  WebSocketUpdateScratchpadMessageSchema,
  WebSocketBroadcastMessageSchema,
]);

export type WebSocketAddIncidentMessage = z.infer<
  typeof WebSocketAddIncidentMessageSchema
>;
export type WebSocketUpdateIncidentMessage = z.infer<
  typeof WebSocketUpdateIncidentMessageSchema
>;
export type WebSocketRemoveIncidentMessage = z.infer<
  typeof WebSocketRemoveIncidentMessageSchema
>;
export type WebSocketUpdateScratchpadMessage = z.infer<
  typeof WebSocketUpdateScratchpadMessageSchema
>;
export type WebSocketBroadcastMessage = z.infer<
  typeof WebSocketBroadcastMessageSchema
>;
export type WebSocketPeerMessage = z.infer<typeof WebSocketPeerMessageSchema>;

export const WebSocketServerShareInfoMessageSchema = z.object({
  type: z.literal("server_share_info"),
  sku: z.string(),
  incidents: InstanceIncidentsSchema,
  scratchpads: InstanceScratchpadSchema,
  users: z.object({
    active: z.array(UserSchema),
    invitations: z.array(InvitationListItemSchema),
  }),
});
export type WebSocketServerShareInfoMessage = z.infer<
  typeof WebSocketServerShareInfoMessageSchema
>;

export const WebsocketServerUserAddMessageSchema = z.object({
  type: z.literal("server_user_add"),
  user: UserSchema,
  activeUsers: z.array(UserSchema),
  invitations: z.array(InvitationListItemSchema),
});
export type WebsocketServerUserAddMessage = z.infer<
  typeof WebsocketServerUserAddMessageSchema
>;

export const WebsocketServerUserRemoveMessageSchema = z.object({
  type: z.literal("server_user_remove"),
  user: UserSchema,
  activeUsers: z.array(UserSchema),
  invitations: z.array(InvitationListItemSchema),
});
export type WebsocketServerUserRemoveMessage = z.infer<
  typeof WebsocketServerUserRemoveMessageSchema
>;

export const WebSocketServerErrorMessageSchema = z.object({
  type: z.literal("server_error"),
  error: z.string(),
});
export type WebSocketServerErrorMessage = z.infer<
  typeof WebSocketServerErrorMessageSchema
>;

export const WebSocketServerMessageSchema = z.discriminatedUnion("type", [
  WebSocketServerShareInfoMessageSchema,
  WebsocketServerUserAddMessageSchema,
  WebsocketServerUserRemoveMessageSchema,
  WebSocketServerErrorMessageSchema,
]);
export type WebSocketServerMessage = z.infer<
  typeof WebSocketServerMessageSchema
>;

export const WebSocketMessageSchema = z.union([
  WebSocketPeerMessageSchema,
  WebSocketServerMessageSchema,
]);
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;

export const WebSocketSenderSchema = z.union([
  z.object({ type: z.literal("server") }),
  z.object({ type: z.literal("client"), name: z.string(), id: z.string() }),
]);
export type WebSocketSender = z.infer<typeof WebSocketSenderSchema>;

export const WebSocketPayloadAdditionalInfoSchema = z.object({
  date: z.string(), // ISO string
  sender: WebSocketSenderSchema,
});

export type WebSocketPayloadAdditionalInfo = z.infer<
  typeof WebSocketPayloadAdditionalInfoSchema
>;

export const WebSocketPayloadSchema = <T extends ZodType>(type: T) =>
  WebSocketPayloadAdditionalInfoSchema.extend(type);
export type WebSocketPayload<T extends WebSocketMessage> = T &
  WebSocketPayloadAdditionalInfo;
