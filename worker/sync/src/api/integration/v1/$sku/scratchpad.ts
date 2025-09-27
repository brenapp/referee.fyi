import {
  ErrorResponses,
  AppArgs,
  ErrorResponseSchema,
} from "../../../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import { verifyIntegrationToken } from "../../../../utils/verify";
import { MatchScratchpadSchema } from "@referee-fyi/share";

export const ParamsSchema = z.object({
  sku: z.string(),
});

export const QuerySchema = z.object({});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      scratchpads: z.array(MatchScratchpadSchema),
    }),
  })
  .meta({
    id: "GetIntegrationV1ScratchpadResponse",
  });

export const route = createRoute({
  method: "get",
  path: "/api/sync/{sku}/scratchpad",
  tags: ["Instance"],
  summary: "Obtains real-time match scratchpad data",
  hide: process.env.WRANGLER_ENVIRONMENT === "production",
  middleware: [verifyIntegrationToken],
  request: {
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Scratchpad data",
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
  const verifyIntegrationToken = c.get("verifyIntegrationToken");
  if (!verifyIntegrationToken) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Integration token verification failed.",
        },
        code: "VerifyIntegrationTokenValuesNotPresent",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  const stub = c.env.INCIDENTS.get(
    c.env.INCIDENTS.idFromString(verifyIntegrationToken.instance.secret)
  );

  const scratchpads = await stub.getAllScratchpads();

  return c.json(
    {
      success: true,
      data: { scratchpads },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};
