import { cors } from "hono/cors";
import { app as baseRouter } from "./router";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIObjectConfig } from "@asteasolutions/zod-to-openapi/dist/v3.0/openapi-generator";
export const imports = {
  "./api/integration/v1/$sku/verify": await import(
    "./api/integration/v1/$sku/verify"
  ),
  "./api/integration/v1/$sku/incident/delete": await import(
    "./api/integration/v1/$sku/incident/delete"
  ),
  "./api/integration/v1/$sku/users": await import(
    "./api/integration/v1/$sku/users"
  ),
  "./api/integration/v1/$sku/incident/json": await import(
    "./api/integration/v1/$sku/incident/json"
  ),
  "./api/integration/v1/$sku/incident/pdf": await import(
    "./api/integration/v1/$sku/incident/pdf"
  ),
  "./api/integration/v1/$sku/incident/csv": await import(
    "./api/integration/v1/$sku/incident/csv"
  ),
  "./api/integration/v1/$sku/asset": await import(
    "./api/integration/v1/$sku/asset"
  ),
  "./api/meta/location": await import("./api/meta/location"),
  "./api/user": await import("./api/user"),
  "./api/$sku/invitation": await import("./api/$sku/invitation"),
  "./api/$sku/invite/put": await import("./api/$sku/invite/put"),
  "./api/$sku/invite/delete": await import("./api/$sku/invite/delete"),
  "./api/$sku/list": await import("./api/$sku/list"),
  "./api/$sku/request/put": await import("./api/$sku/request/put"),
  "./api/$sku/request/get": await import("./api/$sku/request/get"),
  "./api/$sku/create": await import("./api/$sku/create"),
  "./api/$sku/accept": await import("./api/$sku/accept"),
  "./api/$sku/asset/upload_url": await import("./api/$sku/asset/upload_url"),
  "./api/$sku/asset/url": await import("./api/$sku/asset/url"),
  "./api/$sku/asset/preview_url": await import("./api/$sku/asset/preview_url"),
  "./api/$sku/incident/put": await import("./api/$sku/incident/put"),
  "./api/$sku/incident/patch": await import("./api/$sku/incident/patch"),
  "./api/$sku/incident/delete": await import("./api/$sku/incident/delete"),
  "./api/$sku/data": await import("./api/$sku/data"),
  "./api/$sku/join": await import("./api/$sku/join"),
} as const;

export const app = baseRouter
  .openapi(
    imports["./api/integration/v1/$sku/verify"].route,
    imports["./api/integration/v1/$sku/verify"].handler
  )
  .openapi(
    imports["./api/integration/v1/$sku/incident/delete"].route,
    imports["./api/integration/v1/$sku/incident/delete"].handler
  )
  .openapi(
    imports["./api/integration/v1/$sku/users"].route,
    imports["./api/integration/v1/$sku/users"].handler
  )
  .openapi(
    imports["./api/integration/v1/$sku/incident/json"].route,
    imports["./api/integration/v1/$sku/incident/json"].handler
  )
  .openapi(
    imports["./api/integration/v1/$sku/incident/pdf"].route,
    imports["./api/integration/v1/$sku/incident/pdf"].handler
  )
  .openapi(
    imports["./api/integration/v1/$sku/incident/csv"].route,
    imports["./api/integration/v1/$sku/incident/csv"].handler
  )
  .openapi(
    imports["./api/integration/v1/$sku/asset"].route,
    imports["./api/integration/v1/$sku/asset"].handler
  )
  .openapi(
    imports["./api/meta/location"].route,
    imports["./api/meta/location"].handler
  )
  .openapi(imports["./api/user"].route, imports["./api/user"].handler)
  .openapi(
    imports["./api/$sku/invitation"].route,
    imports["./api/$sku/invitation"].handler
  )
  .openapi(
    imports["./api/$sku/invite/put"].route,
    imports["./api/$sku/invite/put"].handler
  )
  .openapi(
    imports["./api/$sku/invite/delete"].route,
    imports["./api/$sku/invite/delete"].handler
  )
  .openapi(imports["./api/$sku/list"].route, imports["./api/$sku/list"].handler)
  .openapi(
    imports["./api/$sku/request/put"].route,
    imports["./api/$sku/request/put"].handler
  )
  .openapi(
    imports["./api/$sku/request/get"].route,
    imports["./api/$sku/request/get"].handler
  )
  .openapi(
    imports["./api/$sku/create"].route,
    imports["./api/$sku/create"].handler
  )
  .openapi(
    imports["./api/$sku/accept"].route,
    imports["./api/$sku/accept"].handler
  )
  .openapi(
    imports["./api/$sku/asset/upload_url"].route,
    imports["./api/$sku/asset/upload_url"].handler
  )
  .openapi(
    imports["./api/$sku/asset/url"].route,
    imports["./api/$sku/asset/url"].handler
  )
  .openapi(
    imports["./api/$sku/asset/preview_url"].route,
    imports["./api/$sku/asset/preview_url"].handler
  )
  .openapi(
    imports["./api/$sku/incident/put"].route,
    imports["./api/$sku/incident/put"].handler
  )
  .openapi(
    imports["./api/$sku/incident/patch"].route,
    imports["./api/$sku/incident/patch"].handler
  )
  .openapi(
    imports["./api/$sku/incident/delete"].route,
    imports["./api/$sku/incident/delete"].handler
  )
  .openapi(imports["./api/$sku/data"].route, imports["./api/$sku/data"].handler)
  .openapi(
    imports["./api/$sku/join"].route,
    imports["./api/$sku/join"].handler
  );

app.use("/api/*", cors());

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

app.doc("/api/openapi", config);

export function getOpenApiDocument() {
  return app.getOpenAPIDocument(config);
}

app.get("/api/swagger", swaggerUI({ url: "/api/openapi" }));

export type AppType = typeof app;
