import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { OpenAPIObjectConfig } from "@asteasolutions/zod-to-openapi/dist/v3.0/openapi-generator";
import { swaggerUI } from "@hono/swagger-ui";
import { AppArgs } from "./schemas";

const app = new OpenAPIHono<AppArgs>();

app.use("/api/*", cors());

export const routes = app
  .openapi(...(await import("./api/integration/v1/$sku/verify")).default)
  .openapi(
    ...(await import("./api/integration/v1/$sku/incident/delete")).default
  )
  .openapi(...(await import("./api/integration/v1/$sku/users")).default)
  .openapi(...(await import("./api/integration/v1/$sku/incident/json")).default)
  .openapi(...(await import("./api/integration/v1/$sku/incident/pdf")).default)
  .openapi(...(await import("./api/integration/v1/$sku/incident/csv")).default)
  .openapi(...(await import("./api/integration/v1/$sku/asset")).default)
  .openapi(...(await import("./api/meta/location")).default)
  .openapi(...(await import("./api/user")).default)
  .openapi(...(await import("./api/$sku/invitation")).default)
  .openapi(...(await import("./api/$sku/invite/put")).default)
  .openapi(...(await import("./api/$sku/invite/delete")).default)
  .openapi(...(await import("./api/$sku/list")).default)
  .openapi(...(await import("./api/$sku/request/put")).default)
  .openapi(...(await import("./api/$sku/request/get")).default)
  .openapi(...(await import("./api/$sku/create")).default)
  .openapi(...(await import("./api/$sku/accept")).default)
  .openapi(...(await import("./api/$sku/asset/upload_url")).default)
  .openapi(...(await import("./api/$sku/asset/url")).default)
  .openapi(...(await import("./api/$sku/asset/preview_url")).default)
  .openapi(...(await import("./api/$sku/incident/put")).default)
  .openapi(...(await import("./api/$sku/incident/patch")).default)
  .openapi(...(await import("./api/$sku/incident/delete")).default)
  .openapi(...(await import("./api/$sku/data")).default)
  .openapi(...(await import("./api/$sku/join")).default);

const config: OpenAPIObjectConfig = {
  openapi: "3.0.0",
  info: {
    title: "Referee FYI Sync Engine",
    version: "0.0.0",
    contact: {
      name: "Brendan McGuire",
    },
    description:
      "The Referee FYI Sync Engine API describes the protocol that different Referee FYI client applications use to share incident and realtime data.",
    license: {
      name: "Copyright (c) 2025 Brendan McGuire. All Rights Reserved",
    },
  },
  externalDocs: {
    url: "https://github.com/brenapp/referee.fyi/blob/main/documents/integrations.md",
    description: "Integration API Documentation",
  },
  tags: [
    {
      name: "Integration",
      description: "Exposes read-only data to third-party applications.",
    },
  ],
};

routes.doc("/api/openapi", config);

export function getOpenApiDocument() {
  return routes.getOpenAPIDocument(config);
}

routes.get("/api/swagger", swaggerUI({ url: "/api/openapi" }));

export type AppType = typeof routes;
