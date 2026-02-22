import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import {
	type WebSocketServerShareInfoMessage,
	WebSocketServerShareInfoMessageSchema,
} from "@referee-fyi/share";
import { z } from "zod/v4";
import {
	type AppArgs,
	type ErrorResponseSchema,
	ErrorResponses,
} from "../../../router";
import {
	VerifySignatureHeadersSchema,
	verifyInvitation,
	verifySignature,
	verifyUser,
} from "../../../utils/verify";
export const ParamsSchema = z.object({
	sku: z.string(),
});
export const QuerySchema = z.object({});

export const SuccessResponseSchema = z
	.object({
		success: z.literal(true),
		data: WebSocketServerShareInfoMessageSchema,
	})
	.meta({
		id: "GetDataResponse",
		description: "Indicates a new shared instance has been created.",
	});

export const route = createRoute({
	method: "get",
	path: "/api/sync/{sku}/data",
	tags: ["Incident"],
	summary: "Get instance share data.",
	hide: process.env.WRANGLER_ENVIRONMENT === "production",
	middleware: [verifySignature, verifyUser, verifyInvitation],
	request: {
		headers: VerifySignatureHeadersSchema,
		params: ParamsSchema,
		query: QuerySchema,
	},
	responses: {
		200: {
			description: "Instance Share Data",
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
export const handler: RouteHandler<Route, AppArgs> = async (c) => {
	const verifyInvitation = c.get("verifyInvitation");
	if (!verifyInvitation) {
		return c.json(
			{
				success: false,
				code: "VerifyInvitationInstanceNotFound",
				error: {
					name: "ValidationError",
					message: "Could not verify invitation.",
				},
			} as const satisfies z.infer<typeof ErrorResponseSchema>,
			403,
		);
	}

	const stub = c.env.INCIDENTS.get(
		c.env.INCIDENTS.idFromString(verifyInvitation.instance.secret),
	);

	const data =
		(await stub.createServerShareMessage()) as WebSocketServerShareInfoMessage;
	return c.json(
		{
			success: true,
			data,
		} as const satisfies z.infer<typeof SuccessResponseSchema>,
		200,
	);
};
