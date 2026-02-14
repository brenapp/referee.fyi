import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../../../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import { verifyTrustedIntegrationJWT } from "../../../../utils/verify";
import { getInstancesForEvent } from "../../../../utils/data";

export const ParamsSchema = z.object({
  sku: z.string(),
});
export const QuerySchema = z.object({});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      instances: z.array(z.string()),
    }),
  })
  .meta({
    id: "GetTrustedIntegrationInstancesResponse",
    description: "All instances opted-in to trusted integrations for this event.",
  });

export const route = createRoute({
  method: "get",
  path: "/api/integration/trusted/{sku}/instances",
  tags: ["Integration API"],
  summary:
    "Lists all instances opted-in to trusted integrations for an event.",
  middleware: [verifyTrustedIntegrationJWT],
  request: {
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Opted-in instances for this event.",
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
  const allInstances = await getInstancesForEvent(c.env, sku);

  const results = await Promise.all(
    allInstances.map(async (secret) => {
      const id = c.env.INCIDENTS.idFromString(secret);
      const stub = c.env.INCIDENTS.get(id);
      const allowed = await stub.getAllowTrusted();
      return { secret, allowed };
    })
  );

  const optedIn = results
    .filter((r) => r.allowed)
    .map((r) => r.secret);

  return c.json(
    {
      success: true,
      data: { instances: optedIn },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};
