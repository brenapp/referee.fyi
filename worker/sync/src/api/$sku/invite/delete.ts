import { app, ErrorResponseSchema, ErrorResponses } from "../../../router";
import { createRoute } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifyInvitation,
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../../utils/verify";
import {
  Invitation,
  WebsocketServerUserRemoveMessage,
} from "@referee-fyi/share";
import {
  deleteInvitation,
  getInvitation,
  getUser,
  setInstance,
} from "../../../utils/data";
import { env } from "cloudflare:workers";

export const ParamsSchema = z.object({
  sku: z.string(),
});
export const QuerySchema = z.object({
  user: z.string(),
});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({}),
  })
  .meta({
    id: "DeleteInvitationResponse",
  });

export const route = createRoute({
  method: "delete",
  path: "/api/{sku}/invite",
  tags: ["Invitation Management"],
  summary: "Remove an invitation from a user.",
  hide: env.ENVIRONMENT !== "staging",
  middleware: [verifySignature, verifyUser, verifyInvitation],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "User removed from invitation successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
        },
      },
    },
    ...ErrorResponses,
  },
});

app.openapi(route, async (c) => {
  const { sku } = c.req.valid("param");
  const { user } = c.req.valid("query");
  const verifyInvitation = c.get("verifyInvitation");
  if (!verifyInvitation) {
    return c.json(
      {
        success: false,
        code: "VerifyInvitationNotFound",
        error: {
          name: "ValidationError",
          message: "Invitation verification failed.",
        },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      403
    );
  }

  const invitation = verifyInvitation.invitation;

  if (!invitation.admin && user !== verifyInvitation.invitation.user) {
    return c.json(
      {
        success: false,
        code: "VerifyInvitationAdminNotAuthorized",
        error: {
          name: "ValidationError",
          message: "You are not authorized to perform this action.",
        },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      403
    );
  }

  const userInvitation: Invitation | null = await getInvitation(
    c.env,
    user,
    sku
  );

  if (!userInvitation) {
    return c.json(
      {
        success: true,
        data: {},
      } as const satisfies z.infer<typeof SuccessResponseSchema>,
      200
    );
  }

  const instance = verifyInvitation.instance;
  const index = instance.invitations.findIndex(
    (i) => i === userInvitation.user
  );
  instance.invitations.splice(index, 1);

  if (userInvitation.admin) {
    const index = instance.admins.findIndex((i) => i === userInvitation.user);
    instance.admins.splice(index, 1);
  }

  if (userInvitation.admin && instance.admins.length < 1) {
    for (const user of instance.invitations) {
      await deleteInvitation(c.env, user, instance.sku);
    }
    instance.invitations = [];
  }

  await deleteInvitation(c.env, user, invitation.sku);
  await setInstance(c.env, instance);

  const id = c.env.INCIDENTS.idFromString(instance.secret);
  const stub = c.env.INCIDENTS.get(id);

  const removedUser = await getUser(c.env, user);
  const message = {
    type: "server_user_remove",
    user: removedUser ?? { key: user, name: "Unknown User" },
    activeUsers: await stub.getActiveUsers(),
    invitations: await stub.getInvitationList(),
  } satisfies WebsocketServerUserRemoveMessage;

  stub.broadcast(message, { type: "server" });

  return c.json(
    {
      success: true,
      data: {},
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
});
