import { app, ErrorResponseSchema, ErrorResponses } from "../../../router";
import { createRoute } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifyInvitation,
  verifyInvitationAdmin,
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../../utils/verify";
import { Invitation } from "@referee-fyi/share";
import { getInvitation, setInstance, setInvitation } from "../../../utils/data";

export const ParamsSchema = z.object({
  sku: z.string(),
});
export const QuerySchema = z.object({
  user: z.string(),
  admin: z.coerce.boolean(),
});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({}),
  })
  .meta({
    id: "PutInvitationResponse",
  });

export const route = createRoute({
  method: "put",
  path: "/api/{sku}/invite",
  tags: ["Invitation Management"],
  summary: "Invites another user to join an instance",
  middleware: [
    verifySignature,
    verifyUser,
    verifyInvitation,
    verifyInvitationAdmin,
  ],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Invitation created successfully",
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
  const { user, admin: inviteAsAdmin } = c.req.valid("query");
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

  const newInvitation: Invitation = {
    id: crypto.randomUUID(),
    admin: inviteAsAdmin,
    user,
    sku,
    instance_secret: verifyInvitation.instance.secret,
    accepted: false,
    from: verifyInvitation.invitation.user,
  };

  const currentInvitation: Invitation | null = await getInvitation(
    c.env,
    user,
    sku
  );

  if (currentInvitation && currentInvitation.accepted) {
    return c.json(
      {
        success: false,
        code: "PutInvitationMustLeaveCurrentInstance",
        error: {
          name: "ValidationError",
          message:
            "This user has already accepted an invitation for this event. They must leave their current instance first.",
        },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  const instance = verifyInvitation.instance;
  if (!instance.invitations.includes(newInvitation.user)) {
    instance.invitations.push(newInvitation.user);
  }

  if (newInvitation.admin && !instance.admins.includes(newInvitation.user)) {
    instance.admins.push(newInvitation.user);
  }

  await setInstance(c.env, instance);
  await setInvitation(c.env, newInvitation);

  return c.json(
    {
      success: true,
      data: {},
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
});
