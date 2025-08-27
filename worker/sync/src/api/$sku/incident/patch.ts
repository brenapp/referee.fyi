import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifyInvitation,
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../../utils/verify";
import {
  Incident,
  INCIDENT_IGNORE,
  IncidentSchema,
  WebSocketSender,
} from "@referee-fyi/share";
import { getUser } from "../../../utils/data";
import { mergeLWW } from "@referee-fyi/consistency";
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
    id: "PatchIncidentResponse",
  });

export const route = createRoute({
  method: "patch",
  path: "/api/{sku}/incident",
  tags: ["Incident"],
  summary: "Edit an incident.",
  hide: env.ENVIRONMENT !== "staging",
  middleware: [verifySignature, verifyUser, verifyInvitation],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    body: {
      required: true,
      description: "Incident body to edit",
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
    409: {
      description: "Incident edit conflict",
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
        code: "PatchIncidentDeleted",
        error: {
          name: "ValidationError",
          message: "This incident has already been deleted.",
        },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  await stub.editIncident(incident);

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

  const currentIncident = await stub.getIncident(incident.id);
  const result = mergeLWW({
    local: currentIncident,
    remote: incident,
    ignore: INCIDENT_IGNORE,
  });
  if (!result.resolved) {
    return c.json(
      {
        success: false,
        code: "PatchIncidentEditInvalid",
        error: {
          name: "ValidationError",
          message: "This incident could not be edited.",
        },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      409
    );
  }

  await stub.editIncident(result.resolved);

  const sender: WebSocketSender = {
    id: user.key,
    name: user.name,
    type: "client",
  };

  await stub.broadcast(
    { type: "update_incident", incident: result.resolved },
    sender
  );

  return c.json(
    {
      success: true,
      data: result.resolved,
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};

export default [route, handler] as const;
