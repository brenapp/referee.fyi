import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifyInvitation,
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../utils/verify";
import {
  WebSocketServerShareInfoMessage,
  WebSocketServerShareInfoMessageSchema,
} from "@referee-fyi/share";
export const ParamsSchema = z.object({
  sku: z.string(),
});
export const QuerySchema = z.object({});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: WebSocketServerShareInfoMessageSchema,
  })
  .meta({
    id: "GetDataResponse",
    description: "Indicates a new shared instance has been created.",
  });

export const route = createRoute({
  method: "get",
  path: "/api/{sku}/data",
  tags: ["Incident"],
  summary: "Get instance share data.",
  hide: process.env.ENVIRONMENT !== "staging",
  middleware: [verifySignature, verifyUser, verifyInvitation],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Instance Share Data",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
        },
      },
    },
    ...ErrorResponses,
  },
});

export type Route = typeof route;
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

  const stub = c.env.INCIDENTS.get(
    c.env.INCIDENTS.idFromString(verifyInvitation.instance.secret)
  );

  const data =
    (await stub.createServerShareMessage()) as WebSocketServerShareInfoMessage;
  return c.json(
    {
      success: true,
      data,
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};

export default [route, handler] as const;
