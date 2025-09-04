import {
  AppArgs,
  ErrorResponses,
  ErrorResponseSchema,
} from "../../../../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifyIntegrationToken,
  VerifyIntegrationTokenParamsSchema,
  VerifyIntegrationTokenQuerySchema,
} from "../../../../../utils/verify";
import { Incident, incidentMatchNameToString } from "@referee-fyi/share";

export const ParamsSchema = VerifyIntegrationTokenParamsSchema;
export const QuerySchema = VerifyIntegrationTokenQuerySchema;

export const route = createRoute({
  method: "get",
  path: "/api/integration/v1/{sku}/incidents.csv",
  tags: ["Integration API"],
  summary: "Get incidents as CSV",
  middleware: [verifyIntegrationToken],
  request: {
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "CSV of incidents",
      content: {
        "text/csv": {
          schema: z.string(),
        },
      },
    },
    ...ErrorResponses,
  },
});

export type Route = typeof route;
export const handler: RouteHandler<typeof route, AppArgs> = async (c) => {
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

  const incidents = (await stub.getAllIncidents()) as Incident[];

  let output =
    "Date,Time,ID,SKU,Division,Match,Team,Outcome,Rules,Notes,Flags\n";

  output += incidents
    .map((incident) => {
      const notes = incident.notes.replaceAll(/[\s\r\n]/g, " ");

      const division =
        incident.match?.type === "match" ? incident.match.division : "";

      return [
        new Date(incident.time).toISOString(),
        new Date(incident.time).toISOString(),
        incident.id,
        incident.event,
        division,
        incidentMatchNameToString(incident.match),
        incident.team,
        incident.outcome,
        incident.rules.join(" "),
        notes,
        incident.flags?.join(" ") ?? "",
      ].join(",");
    })
    .join("\n");

  return c.text(output, 200, {
    "Content-Type": "text/csv",
    "Content-Disposition": `attachment; filename="incidents-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.csv"`,
  });
};
