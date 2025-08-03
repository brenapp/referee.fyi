import { z } from "zod/v4";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";

export const ErrorCode = z.enum(["UpdateQuestionsRefreshFailed"]);

export const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
    code: ErrorCode.optional(),
  })
  .meta({
    id: "ErrorResponse",
    description: "Error response schema",
  });

export const app = new OpenAPIHono<{ Bindings: Env }>();

app.use("/api/*", cors());

app.doc("/openapi", {
  openapi: "3.0.0",
  info: { title: "Referee FYI Rules", version: "0.0.0" },
});

app.get("/swagger", swaggerUI({ url: "/openapi" }));
