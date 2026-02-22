import { createRoute, type RouteHandler } from "@hono/zod-openapi";
import { generateIncidentReportPDF } from "@referee-fyi/pdf-export";
import { Client } from "robotevents";
import { z } from "zod/v4";
import {
	type AppArgs,
	type ErrorResponseSchema,
	ErrorResponses,
} from "../../../../../router";
import {
	VerifyIntegrationTokenParamsSchema,
	VerifyIntegrationTokenQuerySchema,
	verifyIntegrationToken,
} from "../../../../../utils/verify";

export const ParamsSchema = VerifyIntegrationTokenParamsSchema;
export const QuerySchema = VerifyIntegrationTokenQuerySchema;

export const route = createRoute({
	method: "get",
	path: "/api/integration/v1/{sku}/incidents.pdf",
	tags: ["Integration API"],
	summary: "Get incidents as PDF",
	middleware: [verifyIntegrationToken],
	request: {
		params: ParamsSchema,
		query: QuerySchema,
	},
	responses: {
		200: {
			description: "PDF of incidents",
			content: {
				"application/pdf": {
					schema: z.string(),
				},
			},
		},
		...ErrorResponses,
	},
});

export type Route = typeof route;
export const handler: RouteHandler<typeof route, AppArgs> = async (c) => {
	const { sku } = c.req.valid("param");
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

	const client = Client({
		authorization: {
			token: await c.env.ROBOTEVENTS_TOKEN.get(),
		},
	});

	const id = c.env.INCIDENTS.idFromString(
		verifyIntegrationToken.instance.secret,
	);
	const stub = c.env.INCIDENTS.get(id);

	const incidents = await stub.getAllIncidents();
	const invitations = await stub.getInvitationList();

	const formatters = {
		date: new Intl.DateTimeFormat("en-US", {
			timeZone: `${c.req.raw.cf?.timezone ?? "America/Chicago"}`,
			dateStyle: "full",
			timeStyle: "long",
		}),
	};

	const output = await generateIncidentReportPDF({
		sku,
		client,
		incidents,
		users: invitations.map((invitation) => invitation.user),
		formatters,
	});

	return new Response(output, {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="incidents-${new Date()
				.toISOString()
				.replace(/[:.]/g, "-")}.pdf"`,
		},
	});
};
