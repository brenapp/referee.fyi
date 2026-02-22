import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import { UserSchema } from "@referee-fyi/share";
import { z } from "zod/v4";
import {
	type AppArgs,
	type ErrorResponseSchema,
	ErrorResponses,
} from "../../../../router";
import { getRequestCodeUserKey, getUser } from "../../../../utils/data";
import {
	VerifySignatureHeadersSchema,
	verifySignature,
	verifyUser,
} from "../../../../utils/verify";
export const ParamsSchema = z.object({
	sku: z.string(),
});
export const QuerySchema = z.object({
	code: z.string(),
});

export const SuccessResponseSchema = z.object({
	success: z.literal(true),
	data: z.object({
		user: UserSchema,
		version: z.string(),
	}),
});

export const route = createRoute({
	method: "get",
	path: "/api/sync/{sku}/request",
	tags: ["Key Exchange"],
	summary: "Obtains another user's public key.",
	hide: process.env.WRANGLER_ENVIRONMENT === "production",
	middleware: [verifySignature, verifyUser],
	request: {
		headers: VerifySignatureHeadersSchema,
		params: ParamsSchema,
		query: QuerySchema,
	},
	responses: {
		200: {
			description: "Public key retrieved successfully",
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
	const sku = c.req.valid("param").sku;
	const code = c.req.valid("query").code;

	const verifyUser = c.get("verifyUser");
	if (!verifyUser) {
		return c.json(
			{
				success: false,
				error: {
					name: "ValidationError",
					message: "User verification failed.",
				},
				code: "VerifyUserNotRegistered",
			} as const satisfies z.infer<typeof ErrorResponseSchema>,
			401,
		);
	}

	const req = await getRequestCodeUserKey(c.env, code, sku);
	if (!req) {
		return c.json(
			{
				success: false,
				code: "GetRequestCodeUnknownCode",
				error: { name: "ValidationError", message: "No such request code." },
			} as const satisfies z.infer<typeof ErrorResponseSchema>,
			404,
		);
	}

	const { key, version } = req;
	const user = await getUser(c.env, key);
	if (!user) {
		return c.json(
			{
				success: false,
				code: "VerifyUserNotRegistered",
				error: {
					name: "ValidationError",
					message: "User associated with request code not found.",
				},
			} as const satisfies z.infer<typeof ErrorResponseSchema>,
			404,
		);
	}

	return c.json(
		{
			success: true,
			data: { user, version },
		} as const satisfies z.infer<typeof SuccessResponseSchema>,
		200,
	);
};
