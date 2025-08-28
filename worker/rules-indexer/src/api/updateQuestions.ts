import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import { AppArgs, ErrorResponseSchema } from "../router.js";
import { client } from "../qnaplus.js";

export const QuerySchema = z.object({
  version: z.string(),
});

export const QuestionSchema = z
  .object({
    id: z.string(),
    url: z.string(),
    author: z.string(),
    program: z.string(),
    title: z.string(),
    season: z.string(),
    askedTimestamp: z.string(),
    askedTimestampMs: z.number(),
    answeredTimestamp: z.string().nullable(),
    answeredTimestampMs: z.number().nullable(),
    answered: z.boolean(),
    tags: z.array(z.string()),
    question: z.string(),
    questionRaw: z.string(),
    answer: z.string().nullable(),
    answerRaw: z.string().nullable(),
  })
  .meta({
    id: "Question",
    description: "A question in the Q&A system.",
  });

export const QuestionsResponseSchema = z
  .object({
    outdated: z.boolean().optional(),
    version: z.string().optional(),
    questions: z.array(QuestionSchema).optional(),
  })
  .meta({
    id: "QuestionsResponse",
    description: "Response schema for questions update",
  });

export const SuccessfulResponseSchema = z
  .object({
    success: z.literal(true),
    data: QuestionsResponseSchema,
  })
  .meta({
    id: "UpdateQuestionsSuccessResponse",
  });

export const route = createRoute({
  method: "get",
  path: "/api/updateQuestions",
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

export type Route = typeof route;
export const handler: RouteHandler<typeof route, AppArgs> = async (c) => {
  const { version } = c.req.valid("query");
  const response = await client.GET("/internal/update", {
    params: { query: { version } },
  });

  if (response.error || !response.data) {
    return c.json(
      {
        error: response.error || "Unknown error",
        success: false,
        code: "UpdateQuestionsRefreshFailed",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      500
    );
  }

  return c.json(
    { success: true, data: response.data } as const satisfies z.infer<
      typeof SuccessfulResponseSchema
    >,
    200
  );
};

export default [route, handler] as const;
