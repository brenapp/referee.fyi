import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifyInvitation,
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../../utils/verify";
import { WebSocketSender } from "@referee-fyi/share";
import { getUser } from "../../../utils/data";
export const QuerySchema = z.object({
  id: z.string(),
});

export const ParamsSchema = z.object({
  sku: z.string(),
});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({}),
  })
  .meta({
    id: "DeleteIncidentResponse",
  });

export const route = createRoute({
  method: "delete",
  path: "/api/{sku}/incident",
  tags: ["Incident"],
  summary: "Delete an incident.",
  hide: process.env.ENVIRONMENT !== "staging",
  middleware: [verifySignature, verifyUser, verifyInvitation],
  request: {
    headers: VerifySignatureHeadersSchema,
    query: QuerySchema,
    params: ParamsSchema,
  },
  responses: {
    200: {
      description: "Incident deleted successfully",
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
  const { id } = c.req.valid("query");
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

  await stub.deleteIncident(id);

  const user = await getUser(c.env, verifyInvitation.invitation.user);
  if (!user) {
    return c.json(
      {
        success: false,
        code: "VerifyUserNotRegistered",
        error: {
          name: "ValidationError",
          message: "Associated user is not registered.",
        },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      404
    );
  }

  const sender: WebSocketSender = {
    id: user.key,
    name: user.name,
    type: "client",
  };

  await stub.broadcast({ type: "remove_incident", id }, sender);

  return c.json(
    {
      success: true,
      data: {},
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};

export default [route, handler] as const;
