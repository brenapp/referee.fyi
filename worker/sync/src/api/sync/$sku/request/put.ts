import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
	type AppArgs,
	type ErrorResponseSchema,
	ErrorResponses,
} from "../../../../router";
import { getInvitation, setRequestCode } from "../../../../utils/data";
import {
	VerifySignatureHeadersSchema,
	verifySignature,
	verifyUser,
} from "../../../../utils/verify";
export const ParamsSchema = z.object({
	sku: z.string(),
});
export const QuerySchema = z.object({
	version: z.string(),
});

export const SuccessResponseSchema = z.object({
	success: z.literal(true),
	data: z.object({
		code: z.string(),
		ttl: z.number(),
	}),
});

export const route = createRoute({
	method: "put",
	path: "/api/sync/{sku}/request",
	tags: ["Key Exchange"],
	summary: "Publishes your public key.",
	hide: process.env.WRANGLER_ENVIRONMENT === "production",
	middleware: [verifySignature, verifyUser],
	request: {
		headers: VerifySignatureHeadersSchema,
		params: ParamsSchema,
		query: QuerySchema,
	},
	responses: {
		200: {
			description: "Public key published successfully",
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
	const version = c.req.valid("query").version;

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

	const invitation = await getInvitation(c.env, verifyUser.user.key, sku);
	if (invitation) {
		return c.json(
			{
				success: false,
				code: "PutRequestCodeMustLeaveInstance",
				error: {
					name: "ValidationError",
					message: "You must leave your current instance first.",
				},
			} as const satisfies z.infer<typeof ErrorResponseSchema>,
			400,
		);
	}

	const buffer = new Uint8Array(2);
	crypto.getRandomValues(buffer);

	const code = Array.from(new Uint8Array(buffer), (x) =>
		x.toString(16).padStart(2, "0"),
	)
		.join("")
		.toUpperCase();

	await setRequestCode(c.env, code, sku, { key: verifyUser.user.key, version });

	return c.json(
		{
			success: true,
			data: {
				code,
				ttl: 600,
			},
		} as const satisfies z.infer<typeof SuccessResponseSchema>,
		200,
	);
};
