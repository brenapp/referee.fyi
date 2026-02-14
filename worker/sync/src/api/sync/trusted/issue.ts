import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
  verifyUserHasSystemKey,
  signJWT,
} from "../../../utils/verify";

export const ParamsSchema = z.object({});
export const QuerySchema = z.object({
  sub: z.string(),
  ttl: z.coerce.number().optional(),
});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      token: z.string(),
    }),
  })
  .meta({
    id: "IssueTrustedIntegrationTokenResponse",
    description: "Issued trusted integration JWT.",
  });

export const route = createRoute({
  method: "put",
  path: "/api/sync/trusted/issue",
  tags: ["Trusted Integration"],
  summary: "Issues a trusted integration JWT.",
  hide: process.env.WRANGLER_ENVIRONMENT === "production",
  middleware: [verifySignature, verifyUser, verifyUserHasSystemKey],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Trusted integration JWT issued successfully.",
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

  const { sub, ttl } = c.req.valid("query");
  const ttlSeconds = ttl ?? 30 * 24 * 60 * 60; // default 30 days

  const now = Math.floor(Date.now() / 1000);
  const secret = await c.env.TRUSTED_INTEGRATION_SECRET.get();

  const token = await signJWT(
    {
      sub,
      iat: now,
      exp: now + ttlSeconds,
    },
    secret
  );

  return c.json(
    {
      success: true,
      data: { token },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};
