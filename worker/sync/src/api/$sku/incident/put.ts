import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifyInvitation,
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../../utils/verify";
import { Incident, IncidentSchema, WebSocketSender } from "@referee-fyi/share";
import { getUser } from "../../../utils/data";
import { env } from "cloudflare:workers";

export const ParamsSchema = z.object({
  sku: z.string(),
});

export const BodySchema = IncidentSchema;

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: IncidentSchema,
  })
  .meta({
    id: "PutIncidentResponse",
  });

export const route = createRoute({
  method: "put",
  path: "/api/{sku}/incident",
  tags: ["Incident"],
  summary: "Creates a new incident.",
  hide: env.ENVIRONMENT !== "staging",
  middleware: [verifySignature, verifyUser, verifyInvitation],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    body: {
      required: true,
      description: "Incident body to create",
      content: {
        "application/json": {
          schema: BodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Incident created successfully",
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

  const incident = c.req.valid("json") as Incident;

  const stub = c.env.INCIDENTS.get(
    c.env.INCIDENTS.idFromString(verifyInvitation.instance.secret)
  );
  const deleted = await stub.getDeletedIncidents();
  if (deleted.has(incident.id)) {
    return c.json(
      {
        success: false,
        code: "PutIncidentDeleted",
        error: {
          name: "ValidationError",
          message: "This incident has already been deleted.",
        },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  await stub.addIncident(incident);

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
  await stub.broadcast({ type: "add_incident", incident }, sender);

  return c.json(
    {
      success: true,
      data: incident,
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};
