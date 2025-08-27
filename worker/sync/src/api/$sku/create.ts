import { app, ErrorResponseSchema } from "../../router";
import { createRoute } from "@hono/zod-openapi";
import { z } from "zod/v4";
import { ErrorResponses } from "../../router";
import {
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../utils/verify";
import { setInvitation } from "../../utils/data";
import { Invitation, UserInvitationSchema } from "@referee-fyi/share";
import { ShareInstanceInitData } from "../../objects/instance";
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
    id: "PostCreateResponse",
    description: "Indicates a new shared instance has been created.",
  });

export const route = createRoute({
  method: "post",
  path: "/api/{sku}/create",
  tags: ["Invitation Management"],
  summary: "Create a new shared instance, and adds user to it.",
  hide: env.ENVIRONMENT !== "staging",
  middleware: [verifySignature, verifyUser],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Instance created successfully",
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

  const instanceId = c.env.INCIDENTS.newUniqueId();
  const secret = instanceId.toString();

  const invitation: Invitation = {
    id: crypto.randomUUID(),
    admin: true,
    user: verifyUser.user.key,
    sku,
    instance_secret: secret,
    accepted: true,
    from: verifyUser.user.key,
  };

  await setInvitation(c.env, invitation);

  const stub = c.env.INCIDENTS.get(instanceId);

  const body: ShareInstanceInitData = { sku, instance: secret };
  await stub.init(body);

  return c.json(
    {
      success: true,
      data: {
        id: invitation.id,
        admin: invitation.admin,
        accepted: invitation.accepted,
        from: verifyUser.user,
        sku,
      },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
});
