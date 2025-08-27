import { z } from "zod/v4";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import {
  AssetMeta,
  Invitation,
  ShareInstanceMeta,
  User,
} from "@referee-fyi/share";
import type { Image } from "cloudflare/resources/images/v1/v1.mjs";
import { OpenAPIObjectConfig } from "@asteasolutions/zod-to-openapi/dist/v3.0/openapi-generator";

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
  verifyUserAssetAuthorized?: {
    asset: AssetMeta;
    image: Image;
  };
  verifyInvitationAdmin?: {
    admin: boolean;
    systemKey: boolean;
  };
};

export type AppArgs = {
  Bindings: Env;
  Variables: Variables;
};

export const app = new OpenAPIHono<AppArgs>();

export const ErrorCode = z.enum([
  "VerifySignatureValuesNotPresent",
  "VerifySignatureInvalidDateSkew",
  "VerifySignatureInvalidPublicKey",
  "VerifySignatureInvalidSignature",
  "VerifyUserNotRegistered",
  "VerifyUserNotSystemKey",
  "VerifyInvitationNotFound",
  "VerifyInvitationNotAccepted",
  "VerifyInvitationInstanceNotFound",
  "VerifyIntegrationTokenValuesNotPresent",
  "VerifyIntegrationTokenInvalidSignature",
  "VerifyIntegrationTokenInvalidInstance",
  "VerifyIntegrationTokenInvalidUser",
  "VerifyIntegrationTokenInvalidInvitation",
  "VerifyUserAssetAuthorizedValuesNotPresent",
  "VerifyUserAssetAuthorizedAssetNotFound",
  "VerifyUserAssetAuthorizedImageNotFound",
  "VerifyUserAssetAuthorizedUserNotAuthorized",
  "VerifyInvitationAdminNotAuthorized",
  "PutRequestCodeMustLeaveInstance",
  "GetRequestCodeUnknownCode",
  "GetAssetUploadURLInvalidAssetType",
  "GetAssetUploadURLAssetAlreadyExists",
  "GetAssetPreviewURLNotFound",
  "GetAssetURLNotFound",
  "GetInvitationNotFound",
  "GetInvitationUserFromNotFound",
  "PutInvitationAcceptNotFound",
  "PutInvitationAcceptInvalid",
  "PutInvitationMustLeaveCurrentInstance",
  "PutIncidentDeleted",
  "PatchIncidentDeleted",
  "PatchIncidentEditInvalid",
  "JoinInstanceMissingUpgradeHeader",
]);

export const RequestFormatErrorDetails = z.object({
  name: z.literal("ZodError"),
  message: z.string(),
});

export const ValidationErrorDetails = z.object({
  name: z.literal("ValidationError"),
  message: z.string(),
});

export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.union([RequestFormatErrorDetails, ValidationErrorDetails]),
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
  403: {
    description: "Forbidden",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
  404: {
    description: "Not found",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
};

app.use("/api/*", cors());

const config: OpenAPIObjectConfig = {
  openapi: "3.0.0",
  info: {
    title: "Referee FYI Sync Engine",
    version: "0.0.0",
    contact: {
      name: "Brendan McGuire",
    },
    description:
      "The Referee FYI Sync Engine API describes the protocol that different Referee FYI client applications use to share incident and realtime data.",
    license: {
      name: "Copyright (c) 2025 Brendan McGuire. All Rights Reserved",
    },
  },
  externalDocs: {
    url: "https://github.com/brenapp/referee.fyi/blob/main/documents/integrations.md",
    description: "Integration API Documentation",
  },
  tags: [
    {
      name: "Integration",
      description: "Exposes read-only data to third-party applications.",
    },
  ],
};

app.doc("/api/openapi", config);

export function getOpenApiDocument() {
  return app.getOpenAPIDocument(config);
}

app.get("/api/swagger", swaggerUI({ url: "/api/openapi" }));
