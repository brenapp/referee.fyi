import { z, ZodType } from "zod/v4";
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

export const SuccessResponseSchema = (data: ZodType) =>
  z.object({
    success: z.literal(true),
    data,
  });

export const ResponseSchemaTemplate = (data: ZodType) =>
  z.discriminatedUnion("success", [
    ErrorResponseSchema,
    SuccessResponseSchema(data),
  ]);

export const app = new OpenAPIHono<{ Bindings: Env }>();

app.use("/api/*", cors());

app.doc("/openapi", {
  openapi: "3.0.0",
  info: { title: "Referee FYI Rules", version: "0.0.0" },
});

app.get("/swagger", swaggerUI({ url: "/openapi" }));
