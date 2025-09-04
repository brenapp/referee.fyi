import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { OpenAPIObjectConfig } from "@asteasolutions/zod-to-openapi/dist/v3.0/openapi-generator";
import { swaggerUI } from "@hono/swagger-ui";
import { AppArgs } from "./router";

import * as api_integration_v1_$sku_verify from "./api/integration/v1/$sku/verify";
import * as api_integration_v1_$sku_incident_delete from "./api/integration/v1/$sku/incident/delete";
import * as api_integration_v1_$sku_users from "./api/integration/v1/$sku/users";
import * as api_integration_v1_$sku_incident_json from "./api/integration/v1/$sku/incident/json";
import * as api_integration_v1_$sku_incident_pdf from "./api/integration/v1/$sku/incident/pdf";
import * as api_integration_v1_$sku_incident_csv from "./api/integration/v1/$sku/incident/csv";
import * as api_integration_v1_$sku_asset from "./api/integration/v1/$sku/asset";
import * as api_meta_location from "./api/meta/location";
import * as api_sync_register from "./api/sync/register";
import * as api_sync_$sku_invitation from "./api/sync/$sku/invitation";
import * as api_sync_$sku_invite_put from "./api/sync/$sku/invite/put";
import * as api_sync_$sku_invite_delete from "./api/sync/$sku/invite/delete";
import * as api_sync_$sku_list from "./api/sync/$sku/list";
import * as api_sync_$sku_request_put from "./api/sync/$sku/request/put";
import * as api_sync_$sku_request_get from "./api/sync/$sku/request/get";
import * as api_sync_$sku_create from "./api/sync/$sku/create";
import * as api_sync_$sku_accept from "./api/sync/$sku/accept";
import * as api_sync_$sku_asset_upload_url from "./api/sync/$sku/asset/upload_url";
import * as api_sync_$sku_asset_url from "./api/sync/$sku/asset/url";
import * as api_sync_$sku_asset_preview_url from "./api/sync/$sku/asset/preview_url";
import * as api_sync_$sku_incident_put from "./api/sync/$sku/incident/put";
import * as api_sync_$sku_incident_patch from "./api/sync/$sku/incident/patch";
import * as api_sync_$sku_incident_delete from "./api/sync/$sku/incident/delete";
import * as api_sync_$sku_data from "./api/sync/$sku/data";
import * as api_sync_$sku_join from "./api/sync/$sku/join";

const app = new OpenAPIHono<AppArgs>();

app.use("/api/*", cors());

const routes = app
  .openapi(
    api_integration_v1_$sku_verify.route,
    api_integration_v1_$sku_verify.handler
  )
  .openapi(
    api_integration_v1_$sku_incident_delete.route,
    api_integration_v1_$sku_incident_delete.handler
  )
  .openapi(
    api_integration_v1_$sku_users.route,
    api_integration_v1_$sku_users.handler
  )
  .openapi(
    api_integration_v1_$sku_incident_json.route,
    api_integration_v1_$sku_incident_json.handler
  )
  .openapi(
    api_integration_v1_$sku_incident_pdf.route,
    api_integration_v1_$sku_incident_pdf.handler
  )
  .openapi(
    api_integration_v1_$sku_incident_csv.route,
    api_integration_v1_$sku_incident_csv.handler
  )
  .openapi(
    api_integration_v1_$sku_asset.route,
    api_integration_v1_$sku_asset.handler
  )
  .openapi(api_meta_location.route, api_meta_location.handler)
  .openapi(api_sync_register.route, api_sync_register.handler)
  .openapi(api_sync_$sku_invitation.route, api_sync_$sku_invitation.handler)
  .openapi(api_sync_$sku_invite_put.route, api_sync_$sku_invite_put.handler)
  .openapi(
    api_sync_$sku_invite_delete.route,
    api_sync_$sku_invite_delete.handler
  )
  .openapi(api_sync_$sku_list.route, api_sync_$sku_list.handler)
  .openapi(api_sync_$sku_request_put.route, api_sync_$sku_request_put.handler)
  .openapi(api_sync_$sku_request_get.route, api_sync_$sku_request_get.handler)
  .openapi(api_sync_$sku_create.route, api_sync_$sku_create.handler)
  .openapi(api_sync_$sku_accept.route, api_sync_$sku_accept.handler)
  .openapi(
    api_sync_$sku_asset_upload_url.route,
    api_sync_$sku_asset_upload_url.handler
  )
  .openapi(api_sync_$sku_asset_url.route, api_sync_$sku_asset_url.handler)
  .openapi(
    api_sync_$sku_asset_preview_url.route,
    api_sync_$sku_asset_preview_url.handler
  )
  .openapi(api_sync_$sku_incident_put.route, api_sync_$sku_incident_put.handler)
  .openapi(
    api_sync_$sku_incident_patch.route,
    api_sync_$sku_incident_patch.handler
  )
  .openapi(
    api_sync_$sku_incident_delete.route,
    api_sync_$sku_incident_delete.handler
  )
  .openapi(api_sync_$sku_data.route, api_sync_$sku_data.handler)
  .openapi(api_sync_$sku_join.route, api_sync_$sku_join.handler);

app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "ECDSA",
});

const config: OpenAPIObjectConfig = {
  openapi: "3.0.0",
  info: {
    title: "Referee FYI Integration API",
    version: "0.0.0",
    description:
      "The Referee FYI Integration API gives applications readonly access to incident data with the permission of an instance administrator.",
  },
  externalDocs: {
    url: "https://github.com/brenapp/referee.fyi/blob/main/documents/integrations.md",
    description: "Integration API Documentation",
  },
  tags: [
    {
      name: "Integration API",
      description: "Exposes read-only data to third-party applications.",
      externalDocs: {
        description: "Documentation",
        url: "https://github.com/brenapp/referee.fyi/blob/main/documents/integrations.md",
      },
    },
  ],
  security: [{ Bearer: [] }],
};

app.doc("/api/sync/openapi", config);
app.doc("/api/integration/openapi", config);

export function getOpenApiDocument() {
  return app.getOpenAPIDocument(config);
}

app.get(
  "/api/sync/swagger",
  swaggerUI({
    url: "/api/sync/openapi",
  })
);

app.get(
  "/api/integration/swagger",
  swaggerUI({
    url: "/api/integration/openapi",
  })
);

export { app };

export type AppType = typeof routes;
