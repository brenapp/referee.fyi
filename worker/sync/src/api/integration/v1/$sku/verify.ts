import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import { InvitationSchema, UserSchema } from "@referee-fyi/share";
import z from "zod/v4";
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

export const TokenIntrospectionDataSchema = z
	.object({
		valid: z.literal(true),
		user: UserSchema.meta({
			description: "The user associated with this integration token.",
		}),
		invitation: InvitationSchema.pick({
			id: true,
			sku: true,
			admin: true,
			user: true,
			accepted: true,
			from: true,
		}).meta({
			description: "The invitation associated with this integration token.",
		}),
	})
	.meta({
		id: "TokenIntrospectionData",
		description:
			"Contains information about the associated session of a validation integration token.",
	});

export const SuccessResponseSchema = z
	.object({
		success: z.literal(true),
		data: TokenIntrospectionDataSchema,
	})
	.meta({
		id: "GetIntegrationV1VerifyResponse",
		description:
			"Indicates that the integration token is valid and the user is authenticated.",
	});

export const route = createRoute({
	method: "get",
	path: "/api/integration/v1/{sku}/verify",
	tags: ["Integration API"],
	summary: "Verify Integration Token",
	description: "Verifies the integration token and returns user information.",
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

	const invitation = verifyIntegrationToken.invitation;

	return c.json(
		{
			success: true,
			data: {
				valid: true,
				user: verifyIntegrationToken.user,
				invitation: {
					id: invitation.id,
					sku: invitation.sku,
					user: invitation.user,
					from: invitation.from,
					admin: invitation.admin,
					accepted: invitation.accepted,
				},
			},
		} as const satisfies z.infer<typeof SuccessResponseSchema>,
		200,
	);
};
