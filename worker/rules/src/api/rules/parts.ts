import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import { AppArgs, ErrorResponseSchema } from "../../router.js";
import {
  ProgramAbbrSchema,
  YearSchema,
  LegalPartSchema,
  LegalPartsListSchema,
} from "@referee-fyi/rules";
import type { LegalPartsList } from "@referee-fyi/rules";

export const QuerySchema = z.object({
  program: ProgramAbbrSchema.meta({
    description: "The program abbreviation, e.g. V5RC.",
  }),
  season: YearSchema.meta({
    description: "The season year, e.g. 2025-2026.",
  }),
});

export const SuccessfulResponseSchema = z
  .object({
    success: z.literal(true),
    data: LegalPartsListSchema,
  })
  .meta({
    id: "PartsSuccessResponse",
  });

export const route = createRoute({
  method: "get",
  path: "/api/rules/parts",
  request: {
    query: QuerySchema,
  },
  summary: "Get legal parts for a specific program and season.",
  tags: ["rules"],
  responses: {
    200: {
      description: "Legal parts list",
      content: {
        "application/json": {
          schema: SuccessfulResponseSchema,
        },
      },
    },
    404: {
      description: "No parts found for the given program and season.",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

export const handler: RouteHandler<typeof route, AppArgs> = async (c) => {
  const { program, season } = c.req.valid("query");
  const key = `parts:${program}:${season}`;
  const data = await c.env.parts.get<LegalPartsList>(key, "json");

  if (!data) {
    return c.json(
      {
        success: false,
        error: `No parts found for ${program} ${season}. Data may not have been synced yet.`,
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      404
    );
  }

  return c.json(
    { success: true, data } as const satisfies z.infer<
      typeof SuccessfulResponseSchema
    >,
    200
  );
};
