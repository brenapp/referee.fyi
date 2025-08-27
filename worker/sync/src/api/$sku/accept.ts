import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../utils/verify";
import { getInvitation, getUser, setInvitation } from "../../utils/data";
import { User, UserInvitationSchema } from "@referee-fyi/share";
import { env } from "cloudflare:workers";

export const ParamsSchema = z.object({
  sku: z.string(),
});
export const QuerySchema = z.object({
  invitation: z.string().meta({ description: "The invitation ID to accept." }),
});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: UserInvitationSchema,
  })
  .meta({
    id: "PutInvitationAcceptResponse",
    description: "User successfully accepted the invitation.",
  });

export const route = createRoute({
  method: "put",
  path: "/api/{sku}/accept",
  tags: ["Invitation Management"],
  summary: "Accept an invitation to join an shared instance.",
  hide: env.ENVIRONMENT !== "staging",
  middleware: [verifySignature, verifyUser],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Successfully accepted the invitation",
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
  const id = c.req.valid("query").invitation;
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

  const invitation = await getInvitation(c.env, verifyUser.user.key, sku);
  if (!invitation) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "No invitation exists for this user and event.",
        },
        code: "PutInvitationAcceptNotFound",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      404
    );
  }

  if (invitation.id !== id) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "A newer invitation is available.",
        },
        code: "PutInvitationAcceptInvalid",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  const from: User | null = await getUser(c.env, invitation.from);

  if (!from) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Invitation sender not found.",
        },
        code: "GetInvitationUserFromNotFound",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      404
    );
  }

  invitation.accepted = true;
  await setInvitation(c.env, invitation);

  // Tell DO to send an update
  const stub = c.env.INCIDENTS.get(
    c.env.INCIDENTS.idFromString(invitation.instance_secret)
  );
  stub.broadcast(
    {
      type: "server_user_add",
      user: verifyUser.user,
      activeUsers: await stub.getActiveUsers(),
      invitations: await stub.getInvitationList(),
    },
    { type: "server" }
  );

  return c.json(
    {
      success: true,
      data: {
        id: invitation.id,
        accepted: invitation.accepted,
        admin: invitation.admin,
        from,
        sku,
      },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};

export default [route, handler] as const;
