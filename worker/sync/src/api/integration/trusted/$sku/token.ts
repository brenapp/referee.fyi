import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../../../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifyTrustedIntegrationJWT,
  signJWT,
} from "../../../../utils/verify";
import { getInstance } from "../../../../utils/data";

export const ParamsSchema = z.object({
  sku: z.string(),
});
export const QuerySchema = z.object({
  instance: z.string(),
});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      token: z.string(),
    }),
  })
  .meta({
    id: "GetTrustedIntegrationScopedTokenResponse",
    description: "A short-lived scoped token for accessing instance data.",
  });

export const route = createRoute({
  method: "post",
  path: "/api/integration/trusted/{sku}/token",
  tags: ["Integration API"],
  summary:
    "Gets a short-lived scoped token for a specific instance.",
  middleware: [verifyTrustedIntegrationJWT],
  request: {
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Scoped token issued.",
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
  const verifyTrustedIntegration = c.get("verifyTrustedIntegration");

  if (!verifyTrustedIntegration) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Trusted integration verification failed.",
        },
        code: "VerifyTrustedIntegrationTokenValuesNotPresent",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const { sku } = c.req.valid("param");
  const { instance: instanceSecret } = c.req.valid("query");

  // Verify the instance exists
  const instance = await getInstance(c.env, instanceSecret, sku);
  if (!instance) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Instance not found.",
        },
        code: "VerifyIntegrationTokenInvalidInstance",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      404
    );
  }

  // Verify the instance allows trusted integrations
  const id = c.env.INCIDENTS.idFromString(instanceSecret);
  const stub = c.env.INCIDENTS.get(id);
  const allowed = await stub.getAllowTrusted();

  if (!allowed) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message:
            "This instance has not opted in to trusted integrations.",
        },
        code: "TrustedIntegrationNotAllowed",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      403
    );
  }

  // Issue a short-lived scoped token (15 minutes)
  const now = Math.floor(Date.now() / 1000);
  const secret = await c.env.TRUSTED_INTEGRATION_SECRET.get();

  const token = await signJWT(
    {
      instance: instanceSecret,
      sku,
      sub: verifyTrustedIntegration.sub,
      exp: now + 15 * 60,
      iat: now,
      type: "trusted_scoped",
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
