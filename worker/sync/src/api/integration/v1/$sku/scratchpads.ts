import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import {
	type MatchScratchpad,
	MatchScratchpadSchema,
} from "@referee-fyi/share";
import { z } from "zod/v4";
import {
	type AppArgs,
	type ErrorResponseSchema,
	ErrorResponses,
} from "../../../../router";
import {
	VerifyIntegrationTokenParamsSchema,
	VerifyIntegrationTokenQuerySchema,
	verifyIntegrationToken,
} from "../../../../utils/verify";

export const ParamsSchema = VerifyIntegrationTokenParamsSchema;
export const QuerySchema = VerifyIntegrationTokenQuerySchema;

export const InstanceScratchpadsSchema = z
	.object({
		scratchpads: z.array(MatchScratchpadSchema),
	})
	.meta({
		id: "InstanceScratchpads",
		description: "Match scratchpads in a shared instance.",
	});

export const SuccessResponseSchema = z
	.object({
		success: z.literal(true),
		data: InstanceScratchpadsSchema,
	})
	.meta({
		id: "GetIntegrationV1ScratchpadsResponse",
	});

export const route = createRoute({
	method: "get",
	path: "/api/integration/v1/{sku}/scratchpads",
	tags: ["Integration API"],
	summary: "Gets information about match scratchpads in a shared instance.",
	middleware: [verifyIntegrationToken],
	request: {
		params: ParamsSchema,
		query: QuerySchema,
	},
	responses: {
		200: {
			description: "Successful verification",
			content: {
				"application/json": {
					schema: SuccessResponseSchema,
				},
			},
		},
		...ErrorResponses,
	},
});

export type Route = typeof route;
export const handler: RouteHandler<typeof route, AppArgs> = async (c) => {
	const verifyIntegrationToken = c.get("verifyIntegrationToken");
	if (!verifyIntegrationToken) {
		return c.json(
			{
				success: false,
				error: {
					name: "ValidationError",
					message: "Integration token verification failed.",
				},
				code: "VerifyIntegrationTokenValuesNotPresent",
			} as const satisfies z.infer<typeof ErrorResponseSchema>,
			400,
		);
	}

	const stub = c.env.INCIDENTS.get(
		c.env.INCIDENTS.idFromString(verifyIntegrationToken.instance.secret),
	);

	const scratchpads: MatchScratchpad[] = await stub.getAllScratchpads();

	return c.json(
		{
			success: true,
			data: {
				scratchpads,
			},
		} as const satisfies z.infer<typeof SuccessResponseSchema>,
		200,
	);
};
