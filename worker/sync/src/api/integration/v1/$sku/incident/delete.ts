import z from "zod/v4";
import {
  app,
  ErrorResponses,
  ErrorResponseSchema,
} from "../../../../../router";
import {
  verifyIntegrationToken,
  VerifyIntegrationTokenParamsSchema,
  VerifyIntegrationTokenQuerySchema,
} from "../../../../../utils/verify";
import { createRoute } from "@hono/zod-openapi";

export const ParamsSchema = VerifyIntegrationTokenParamsSchema;
export const QuerySchema = VerifyIntegrationTokenQuerySchema.extend({
  id: z.string(),
});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({}),
  })
  .meta({
    id: "DeleteIntegrationV1IncidentResponse",
  });

export const deleteRoute = createRoute({
  method: "delete",
  path: "/api/integration/v1/{sku}/incident",
  tags: ["Integration"],
  summary: "Delete an incident in a shared instance",
  description:
    "Deletes an incident in a shared instance. Requires a system token.",
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

app.openapi(deleteRoute, async (c) => {
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

  if (verifyIntegrationToken.grantType !== "system") {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "You are not authorized to perform this action.",
        },
        code: "VerifyIntegrationTokenInvalidUser",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const stub = c.env.INCIDENTS.get(
    c.env.INCIDENTS.idFromString(verifyIntegrationToken.instance.secret)
  );

  await stub.deleteIncident(c.req.valid("query").id);

  return c.json(
    {
      success: true,
      data: {},
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
});
