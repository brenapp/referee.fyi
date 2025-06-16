import { Hono } from "hono";
import { z } from "zod";
import { describeRoute, openAPISpecs } from "hono-openapi";
import { resolver, validator } from "hono-openapi/zod";
import { scheduled } from "./scheduled";
import { client } from "./qnaplus";

const app = new Hono<{ Bindings: Env }>();

app.get(
  "/api/search",
  describeRoute({}),
  validator(
    "query",
    z.object({
      query: z.string().min(4),
    })
  ),
  async (c) => {
    const { query } = c.req.valid("query");

    const results = await c.env.ai.autorag("referee-fyi-rules-rag").search({
      query,
      rewrite_query: true,
      filters: {
        type: "and",
        filters: [
          {
            type: "eq",
            key: "folder",
            value: "V5RC_2024-2025/",
          },
        ],
      },
    });

    return c.json({ success: true, results });
  }
);

export const QuestionSchema = z.object({
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
});

app.get(
  "/api/updateQuestions",
  describeRoute({
    responses: {
      200: {
        description: "Update successful",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                outdated: z.boolean().optional(),
                version: z.string(),
                questions: z.array(QuestionSchema).optional(),
              })
            ),
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: resolver(z.object({ error: z.string() })),
          },
        },
      },
    },
  }),
  validator(
    "query",
    z.object({
      version: z.string(),
    })
  ),
  async (c) => {
    const { version } = c.req.valid("query");
    const response = await client.GET("/internal/update", {
      params: { query: { version } },
    });

    if (response.error || !response.data) {
      return c.json({ error: response.error }, 500);
    }

    return c.json(response.data, 200);
  }
);

app.get(
  "/openapi",
  openAPISpecs(app, {
    documentation: {
      info: { title: "Referee FYI Rules", version: "0.0.0" },
    },
  })
);

export default {
  ...app,
  scheduled,
} satisfies ExportedHandler<Env>;
