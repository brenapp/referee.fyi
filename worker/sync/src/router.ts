import { z } from "zod/v4";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { Invitation, ShareInstanceMeta, User } from "@referee-fyi/share";

export type Variables = {
  verifySignature?: {
    key: CryptoKey;
    keyHex: string;
    payload: string;
  };
  verifyUser?: {
    user: User;
  };
  verifyInvitation?: {
    invitation: Invitation;
    instance: ShareInstanceMeta;
  };
  verifyIntegrationToken?: {
    grantType: "bearer" | "system";
    user: User;
    invitation: Invitation;
    instance: ShareInstanceMeta;
  };
};

export const app = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

export const ErrorCode = z.enum([
  "VerifySignatureValuesNotPresent",
  "VerifySignatureInvalidDateSkew",
  "VerifySignatureInvalidPublicKey",
  "VerifySignatureInvalidSignature",
  "VerifyUserNotRegistered",
  "VerifyInvitationNotFound",
  "VerifyInvitationNotAccepted",
  "VerifyInvitationInstanceNotFound",
  "VerifyIntegrationTokenValuesNotPresent",
  "VerifyIntegrationTokenInvalidSignature",
  "VerifyIntegrationTokenInvalidInstance",
  "VerifyIntegrationTokenInvalidUser",
  "VerifyIntegrationTokenInvalidInvitation",
]);

export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
    code: ErrorCode.optional(),
  })
  .meta({
    id: "ErrorResponse",
    description: "Error response schema",
  });

export const ErrorResponses = {
  400: {
    description: "Bad request",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
  401: {
    description: "Unauthorized",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
};

app.use("/api/*", cors());

app.doc("/openapi", {
  openapi: "3.0.0",
  info: { title: "Referee FYI Sync Engine", version: "0.0.0" },
});

app.get("/swagger", swaggerUI({ url: "/openapi" }));
