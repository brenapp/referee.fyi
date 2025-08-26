import {
  app,
  ErrorResponses,
  ErrorResponseSchema,
} from "../../../../../router";
import { createRoute } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifyIntegrationToken,
  VerifyIntegrationTokenParamsSchema,
  VerifyIntegrationTokenQuerySchema,
} from "../../../../../utils/verify";
import { IncidentSchema } from "@referee-fyi/share";

export const ParamsSchema = VerifyIntegrationTokenParamsSchema;
export const QuerySchema = VerifyIntegrationTokenQuerySchema;

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: IncidentSchema.array(),
  })
  .meta({
    id: "GetIntegrationV1IncidentsResponse",
  });

export const route = createRoute({
  method: "get",
  path: "/api/integration/v1/{sku}/incidents.json",
  tags: ["Integration"],
  summary: "Get incidents as JSON",
  middleware: [verifyIntegrationToken],
  request: {
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "JSON of incidents",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: IncidentSchema.array(),
          }),
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

  const stub = c.env.INCIDENTS.get(
    c.env.INCIDENTS.idFromString(verifyIntegrationToken.instance.secret)
  );

  const incidents = await stub.getAllIncidents();

  return c.json(
    {
      success: true,
      data: incidents,
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
});
