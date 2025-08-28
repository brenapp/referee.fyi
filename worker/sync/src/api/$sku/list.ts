import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../utils/verify";
import { getInstancesForEvent } from "../../utils/data";
import { isSystemKey } from "../../utils/systemKey";
export const ParamsSchema = z.object({
  sku: z.string(),
});
export const QuerySchema = z.object({});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      instances: z.array(z.string()),
    }),
  })
  .meta({
    id: "GetInvitationListResponse",
    description: "All active instances for an event.",
  });

export const route = createRoute({
  method: "get",
  path: "/api/{sku}/list",
  tags: ["Invitation Management"],
  summary: "Gets all active instances for an event.",
  hide: process.env.ENVIRONMENT !== "staging",
  middleware: [verifySignature, verifyUser],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "All active instances for an event.",
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
  const sku = c.req.valid("param").sku;
  const verifyUser = c.get("verifyUser");

  if (!verifyUser) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "User verification failed.",
        },
        code: "VerifyUserNotRegistered",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const isSystem = await isSystemKey(c.env, verifyUser.user.key);
  if (!isSystem) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "You are not authorized to perform this action.",
        },
        code: "VerifyUserNotSystemKey",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      403
    );
  }

  const ids = await getInstancesForEvent(c.env, sku);
  const instances = ids.map((id) => id.split("#")[1]);
  return c.json(
    {
      success: true,
      data: { instances },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};

export default [route, handler] as const;
