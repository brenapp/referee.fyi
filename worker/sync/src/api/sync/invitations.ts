import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import { InvitationListItemSchema, UserSchema } from "@referee-fyi/share";
import { z } from "zod/v4";
import {
	type AppArgs,
	type ErrorResponseSchema,
	ErrorResponses,
} from "../../router";
import {
	getAllInvitationsForInstance,
	getAllInvitationsForUser,
} from "../../utils/data";
import {
	VerifySignatureHeadersSchema,
	verifySignature,
	verifyUser,
} from "../../utils/verify";

export const ParamsSchema = z.object({});
export const QuerySchema = z.object({});

export const UserInvitationWithUsersSchema = z
	.object({
		sku: z.string(),
		admin: z.boolean(),
		accepted: z.boolean(),
		from: UserSchema,
		users: z.array(InvitationListItemSchema),
	})
	.meta({
		id: "UserInvitationWithUsers",
		description:
			"A user invitation with details about all users in the instance.",
	});

export const SuccessResponseSchema = z
	.object({
		success: z.literal(true),
		data: z.object({
			invitations: z.array(UserInvitationWithUsersSchema),
		}),
	})
	.meta({
		id: "GetAllUserInvitationsResponse",
		description: "All invitations for the current user across all events.",
	});

export const route = createRoute({
	method: "get",
	path: "/api/sync/invitations",
	tags: ["Invitation Management"],
	summary: "Gets all invitations for the current user across all events.",
	hide: process.env.WRANGLER_ENVIRONMENT === "production",
	middleware: [verifySignature, verifyUser],
	request: {
		headers: VerifySignatureHeadersSchema,
		params: ParamsSchema,
		query: QuerySchema,
	},
	responses: {
		200: {
			description: "All invitations for the user.",
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
	const verifyUserData = c.get("verifyUser");

	if (!verifyUserData) {
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

	const userInvitations = await getAllInvitationsForUser(
		c.env,
		verifyUserData.user.key,
	);

	const invitationsWithUsers = await Promise.all(
		userInvitations.map(async (inv) => {
			const users = await getAllInvitationsForInstance(
				c.env,
				inv.instance_secret,
				inv.sku,
			);
			return {
				sku: inv.sku,
				admin: inv.admin,
				accepted: inv.accepted,
				from: inv.from,
				users,
			};
		}),
	);

	return c.json(
		{
			success: true,
			data: { invitations: invitationsWithUsers },
		} as const satisfies z.infer<typeof SuccessResponseSchema>,
		200,
	);
};
