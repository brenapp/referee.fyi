import { Hono } from "hono";
import { scheduled } from "./scheduled";
import { resolver } from "hono-openapi/zod";
import { sValidator } from "@hono/standard-validator";
import { z } from "zod/v4";

const app = new Hono();

//#region POST /crawl/game

app.post(
  "/crawl/game",
  describeRoute({
    description: "Crawl game rules",
    responses: {
      200: {
        description: "Successfully crawled game rules.",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                success: z
                  .boolean()
                  .meta({
                    description: "Indicates if the crawl was successful",
                  }),
                message: z
                  .string()
                  .meta({
                    description: "A message providing additional information",
                  }),
              })
            ),
          },
        },
      },
    },
  }),
  sValidator(
    "query",
    z.object({
      url: z.url().meta({ description: "The URL of the game rules to crawl" }),
    })
  ),
  (c) => {
    const query = c.req.valid("query");
    return c.json({
      success: true,
      message: `Crawled game rules from ${query.url}`,
    });
  }
);

//#endregion

//#region GET /openapi
app.get(
  "/openapi.json",
  openAPISpecs(app, {
    documentation: {
      info: {
        title: "Rules Indexer",
        version: "1.0.0",
        description: "Rules",
      },
    },
  })
);
//#endregion

export default {
  ...app,
  scheduled,
} satisfies ExportedHandler<Env>;
