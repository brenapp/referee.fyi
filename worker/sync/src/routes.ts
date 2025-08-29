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
import * as api_user from "./api/user";
import * as api_$sku_invitation from "./api/$sku/invitation";
import * as api_$sku_invite_put from "./api/$sku/invite/put";
import * as api_$sku_invite_delete from "./api/$sku/invite/delete";
import * as api_$sku_list from "./api/$sku/list";
import * as api_$sku_request_put from "./api/$sku/request/put";
import * as api_$sku_request_get from "./api/$sku/request/get";
import * as api_$sku_create from "./api/$sku/create";
import * as api_$sku_accept from "./api/$sku/accept";
import * as api_$sku_asset_upload_url from "./api/$sku/asset/upload_url";
import * as api_$sku_asset_url from "./api/$sku/asset/url";
import * as api_$sku_asset_preview_url from "./api/$sku/asset/preview_url";
import * as api_$sku_incident_put from "./api/$sku/incident/put";
import * as api_$sku_incident_patch from "./api/$sku/incident/patch";
import * as api_$sku_incident_delete from "./api/$sku/incident/delete";
import * as api_$sku_data from "./api/$sku/data";
import * as api_$sku_join from "./api/$sku/join";

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
  .openapi(api_user.route, api_user.handler)
  .openapi(api_$sku_invitation.route, api_$sku_invitation.handler)
  .openapi(api_$sku_invite_put.route, api_$sku_invite_put.handler)
  .openapi(api_$sku_invite_delete.route, api_$sku_invite_delete.handler)
  .openapi(api_$sku_list.route, api_$sku_list.handler)
  .openapi(api_$sku_request_put.route, api_$sku_request_put.handler)
  .openapi(api_$sku_request_get.route, api_$sku_request_get.handler)
  .openapi(api_$sku_create.route, api_$sku_create.handler)
  .openapi(api_$sku_accept.route, api_$sku_accept.handler)
  .openapi(api_$sku_asset_upload_url.route, api_$sku_asset_upload_url.handler)
  .openapi(api_$sku_asset_url.route, api_$sku_asset_url.handler)
  .openapi(api_$sku_asset_preview_url.route, api_$sku_asset_preview_url.handler)
  .openapi(api_$sku_incident_put.route, api_$sku_incident_put.handler)
  .openapi(api_$sku_incident_patch.route, api_$sku_incident_patch.handler)
  .openapi(api_$sku_incident_delete.route, api_$sku_incident_delete.handler)
  .openapi(api_$sku_data.route, api_$sku_data.handler)
  .openapi(api_$sku_join.route, api_$sku_join.handler);

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

export { app };

export type AppType = typeof routes;
