import { Hono } from "hono";
import { z } from "zod";
import { describeRoute, openAPISpecs } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { scheduled } from "./scheduled";

const app = new Hono<{ Bindings: Env }>();

app.get(
  "/search",
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

app.get("/openapi", openAPISpecs(app, {}));

export default {
  ...app,
  scheduled,
} satisfies ExportedHandler<Env>;
