import { z } from "zod/v4";
import { OpenAPIHono } from "@hono/zod-openapi";

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

export type AppArgs = {
  Bindings: Env;
};
