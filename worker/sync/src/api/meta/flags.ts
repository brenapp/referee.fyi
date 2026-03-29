import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import type { AppArgs } from "../../router";
import { getFlags } from "../../utils/data";

const FlagSchema = z.object({
	key: z.string(),
	value: z.string().nullable(),
});

const SuccessResponseSchema = z
	.object({
		success: z.literal(true),
		data: z.array(FlagSchema),
	})
	.meta({
		id: "GetMetaFlagsResponse",
		description: "Response for the /api/meta/flags endpoint",
	});

export const route = createRoute({
	method: "get",
	path: "/api/meta/flags",
	tags: ["Meta"],
	summary: "Lists all active flags.",
	description: "Returns all active flags from the database.",
	responses: {
		200: {
			description: "List of active flags",
			content: {
				"application/json": {
					schema: SuccessResponseSchema,
				},
			},
		},
	},
});

export type Route = typeof route;
export const handler: RouteHandler<typeof route, AppArgs> = async (c) => {
	const flags = await getFlags(c.env);

	return c.json(
		{
			success: true,
			data: flags.map((flag) => ({ key: flag.key, value: flag.value })),
		} as const satisfies z.infer<typeof SuccessResponseSchema>,
		200,
	);
};
