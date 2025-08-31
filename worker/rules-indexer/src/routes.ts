import { cors } from "hono/cors";
import { swaggerUI } from "@hono/swagger-ui";

import * as api_updateQuestions from "./api/updateQuestions.js";
import * as api_search from "./api/search.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import { AppArgs } from "./router.js";

const app = new OpenAPIHono<AppArgs>();

app.use("/api/*", cors());

const routes = app
  .openapi(api_updateQuestions.route, api_updateQuestions.handler)
  .openapi(api_search.route, api_search.handler);

const config = {
  openapi: "3.0.0",
  info: { title: "Referee FYI Rules", version: "0.0.0" },
};

app.doc("/api/openapi", config);

export function getOpenApiDocument() {
  return app.getOpenAPIDocument(config);
}

app.get("/api/swagger", swaggerUI({ url: "/api/openapi" }));

export { app };

export type AppType = typeof routes;
