import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../utils/verify";
import { getInvitation, getUser } from "../../utils/data";
import { Invitation, User, UserInvitationSchema } from "@referee-fyi/share";
import { env } from "cloudflare:workers";

export const ParamsSchema = z.object({
  sku: z.string(),
});
export const QuerySchema = z.object({});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: UserInvitationSchema,
  })
  .meta({
    id: "GetInvitationResponse",
    description: "The user's invitation for an event.",
  });

export const route = createRoute({
  method: "get",
  path: "/api/{sku}/invitation",
  tags: ["Invitation Management"],
  summary: "Gets the user's current invitation for an event.",
  hide: env.ENVIRONMENT !== "staging",
  middleware: [verifySignature, verifyUser],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "The user's invitation",
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

  const invitation: Invitation | null = await getInvitation(
    c.env,
    verifyUser.user.key,
    sku
  );

  if (!invitation) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "No invitation found for this user and event.",
        },
        code: "GetInvitationNotFound",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      404
    );
  }

  const from: User | null = await getUser(c.env, invitation.from);
  if (!from) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Could not get information about inviter.",
        },
        code: "GetInvitationUserFromNotFound",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      404
    );
  }

  return c.json(
    {
      success: true,
      data: {
        id: invitation.id,
        admin: invitation.admin,
        from,
        accepted: invitation.accepted,
        sku,
      },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};

export default [route, handler] as const;
