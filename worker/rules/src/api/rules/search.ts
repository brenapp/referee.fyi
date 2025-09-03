import { AppArgs } from "../../router.js";
import { z, createRoute, RouteHandler } from "@hono/zod-openapi";

export const QuerySchema = z.object({
  query: z.string().min(4),
});

export const AutoRagSearchResponseSchema = z
  .object({
    object: z.literal("vector_store.search_results.page"),
    search_query: z.string(),
    data: z.array(
      z.object({
        file_id: z.string(),
        filename: z.string(),
        score: z.number(),
        attributes: z.record(
          z.string(),
          z.union([z.string(), z.number(), z.boolean(), z.null()])
        ),
        content: z.array(
          z.object({
            type: z.literal("text"),
            text: z.string(),
          })
        ),
      })
    ),
    has_more: z.boolean(),
    next_page: z.string().nullable(),
  })
  .meta({
    id: "SearchResponse",
    description: "The search response",
  });

export const SuccessfulResponseSchema = z
  .object({
    success: z.literal(true),
    data: AutoRagSearchResponseSchema,
  })
  .meta({
    id: "SearchSuccessResponse",
  });

export const route = createRoute({
  tags: ["rules"],
  summary: "Search for rules and Q&As.",
  method: "get",
  path: "/api/rules/search",
  request: {
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Search results",
      content: {
        "application/json": {
          schema: SuccessfulResponseSchema,
        },
      },
    },
  },
});

export const handler: RouteHandler<typeof route, AppArgs> = async (c) => {
  const { query } = c.req.valid("query");
  const data = await c.env.ai.autorag("referee-fyi-rules-rag").search({
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
  return c.json(
    { success: true, data } as const satisfies z.infer<
      typeof SuccessfulResponseSchema
    >,
    200
  );
};
