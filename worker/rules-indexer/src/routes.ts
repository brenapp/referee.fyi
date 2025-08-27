import { cors } from "hono/cors";
import { app as baseRouter } from "./router.js";
import { swaggerUI } from "@hono/swagger-ui";

export const app = baseRouter
  .openapi(...(await import("./api/updateQuestions.js")).default)
  .openapi(...(await import("./api/search.js")).default);

app.use("/api/*", cors());

const config = {
  openapi: "3.0.0",
  info: { title: "Referee FYI Rules", version: "0.0.0" },
};

app.doc("/openapi", config);

export function getOpenApiDocument() {
  return app.getOpenAPIDocument(config);
}

app.get("/swagger", swaggerUI({ url: "/openapi" }));
