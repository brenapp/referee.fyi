import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import {
	type InvitationListItem,
	InvitationListItemSchema,
	type User,
	UserSchema,
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

export const InstanceUsersSchema = z
	.object({
		invitations: z.array(InvitationListItemSchema),
		active: z.array(UserSchema).meta({
			description:
				"The list of users who are current connected to the instance websocket.",
		}),
	})
	.meta({
		id: "InstanceUsers",
		description: "Information about the current users in a shared instance.",
	});

export const SuccessResponseSchema = z
	.object({
		success: z.literal(true),
		data: InstanceUsersSchema,
	})
	.meta({
		id: "GetIntegrationV1UsersResponse",
	});

export const route = createRoute({
	method: "get",
	path: "/api/integration/v1/{sku}/users",
	tags: ["Integration API"],
	summary: "Gets information about the users in a shared instance.",
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

	const invitations: InvitationListItem[] = await stub.getInvitationList();
	const active: User[] = await stub.getActiveUsers();

	return c.json(
		{
			success: true,
			data: {
				invitations,
				active,
			},
		} as const satisfies z.infer<typeof SuccessResponseSchema>,
		200,
	);
};
