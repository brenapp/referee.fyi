import z from "zod/v4";
import { app, ErrorResponses, ErrorResponseSchema } from "../../../../router";
import {
  verifyIntegrationToken,
  VerifyIntegrationTokenParamsSchema,
  VerifyIntegrationTokenQuerySchema,
} from "../../../../utils/verify";
import { createRoute } from "@hono/zod-openapi";

export const ParamsSchema = VerifyIntegrationTokenParamsSchema;
export const QuerySchema = VerifyIntegrationTokenQuerySchema;

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      valid: z.literal(true),
    }),
  })
  .meta({
    id: "GetIntegrationV1VerifyResponse",
    description:
      "Indicates that the integration token is valid and the user is authenticated.",
  });

export const route = createRoute({
  method: "get",
  path: "/api/integration/v1/{sku}/verify",
  tags: ["Integration"],
  summary: "Verify Integration Token",
  description: "Verifies the integration token and returns user information.",
  middlewares: [verifyIntegrationToken],
  request: {
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Successful verification",
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
        error: "Integration token verification failed.",
        code: "VerifyIntegrationTokenValuesNotPresent",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  return c.json(
    {
      success: true,
      data: {
        valid: true,
      },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
});
