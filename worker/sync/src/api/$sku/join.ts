import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifyInvitation,
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../utils/verify";
export const ParamsSchema = z.object({
  sku: z.string(),
});
export const QuerySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const route = createRoute({
  method: "get",
  path: "/api/{sku}/join",
  tags: ["Instance"],
  summary: "Join an instance websocket",
  hide: process.env.ENVIRONMENT !== "staging",
  middleware: [verifySignature, verifyUser, verifyInvitation],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    101: {
      description: "Upgrade to WebSocket",
      content: {},
    },
    426: {
      description: "Upgrade required",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    ...ErrorResponses,
  },
});

export type Route = typeof route;

// @ts-expect-error OpenAPI WebSocket Handled
export const handler: RouteHandler<Route, AppArgs> = async (c) => {
  const verifyInvitation = c.get("verifyInvitation");
  if (!verifyInvitation) {
    return c.json(
      {
        success: false,
        code: "VerifyInvitationInstanceNotFound",
        error: {
          name: "ValidationError",
          message: "Could not verify invitation.",
        },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      403
    );
  }

  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader?.toLowerCase() !== "websocket") {
    return c.json(
      {
        success: false,
        code: "JoinInstanceMissingUpgradeHeader",
        error: {
          name: "ValidationError",
          message: "Upgrade header must be 'websocket'.",
        },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      426
    );
  }

  const stub = c.env.INCIDENTS.get(
    c.env.INCIDENTS.idFromString(verifyInvitation.instance.secret)
  );

  return stub.fetch(c.req.raw);
};

export default [route, handler] as const;
