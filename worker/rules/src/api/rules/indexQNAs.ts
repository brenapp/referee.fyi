import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import { AppArgs, ErrorResponseSchema } from "../../router.js";
import { client } from "../../qnaplus.js";
import { fetchUpdatedQNAs } from "../../jobs/fetchUpdatedQNAs.js";

export const QuerySchema = z.object({});

export const SuccessfulResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      version: z.string().nullable(),
    }),
  })
  .meta({
    id: "UpdateQuestionsSuccessResponse",
  });

export const route = createRoute({
  method: "get",
  path: "/api/rules/indexQNAs",
  request: {
    query: QuerySchema,
  },
  summary: "Update questions from the QNAPlus API.",
  tags: ["rules"],
  responses: {
    200: {
      description: "Update successful",
      content: {
        "application/json": {
          schema: SuccessfulResponseSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const handler: RouteHandler<typeof route, AppArgs> = async (c) => {
  const version = await fetchUpdatedQNAs(c.env);
  return c.json(
    { success: true, data: { version } } as const satisfies z.infer<
      typeof SuccessfulResponseSchema
    >,
    200
  );
};
