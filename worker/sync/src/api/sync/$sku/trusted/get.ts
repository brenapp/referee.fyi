import {
  ErrorResponseSchema,
  ErrorResponses,
  AppArgs,
} from "../../../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifyInvitation,
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../../../utils/verify";

export const ParamsSchema = z.object({
  sku: z.string(),
});
export const QuerySchema = z.object({});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      allow_trusted: z.boolean(),
    }),
  })
  .meta({
    id: "GetTrustedIntegrationStatusResponse",
    description: "Trusted integration opt-in status for this instance.",
  });

export const route = createRoute({
  method: "get",
  path: "/api/sync/{sku}/trusted",
  tags: ["Trusted Integration"],
  summary: "Gets the trusted integration opt-in status for this instance.",
  hide: process.env.WRANGLER_ENVIRONMENT === "production",
  middleware: [verifySignature, verifyUser, verifyInvitation],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Trusted integration status.",
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
        code: "VerifyInvitationNotFound",
        error: {
          name: "ValidationError",
          message: "Invitation verification failed.",
        },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      403
    );
  }

  const id = c.env.INCIDENTS.idFromString(
    verifyInvitation.instance.secret
  );
  const stub = c.env.INCIDENTS.get(id);
  const allowTrusted = await stub.getAllowTrusted();

  return c.json(
    {
      success: true,
      data: { allow_trusted: allowTrusted },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};
