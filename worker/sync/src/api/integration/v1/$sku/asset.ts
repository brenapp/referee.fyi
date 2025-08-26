import { z } from "zod/v4";
import { app, ErrorResponses, ErrorResponseSchema } from "../../../../router";
import {
  verifyIntegrationToken,
  VerifyIntegrationTokenParamsSchema,
  VerifyIntegrationTokenQuerySchema,
  verifyUserAssetAuthorized,
  VerifyUserAssetAuthorizedQuerySchema,
} from "../../../../utils/verify";
import { createRoute } from "@hono/zod-openapi";

export const ParamsSchema = VerifyIntegrationTokenParamsSchema;
export const QuerySchema = VerifyIntegrationTokenQuerySchema.extend(
  VerifyUserAssetAuthorizedQuerySchema
);

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({}),
  })
  .meta({
    id: "GetIntegrationV1UsersResponse",
  });

export const route = createRoute({
  method: "get",
  path: "/api/integration/v1/{sku}/asset",
  tags: ["Integration"],
  summary: "Gets information about an asset.",
  middlewares: [verifyIntegrationToken, verifyUserAssetAuthorized],
  request: {
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Asset information",
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

  return c.json(
    {
      success: true,
      data: {},
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
});
