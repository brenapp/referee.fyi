import { z } from "zod/v4";

export const ShareInstanceMetaSchema = z
	.object({
		sku: z.string(),
		admins: z.array(z.string()),
		invitations: z.array(z.string()),
		secret: z.string(),
	})
	.meta({
		id: "ShareInstanceMeta",
		description: "Overall metadata for a shared instance.",
	});
export type ShareInstanceMeta = z.infer<typeof ShareInstanceMetaSchema>;

export const InvitationSchema = z
	.object({
		id: z.string(),
		sku: z.string(),
		instance_secret: z.string(),
		user: z.string(),
		from: z.string(),
		admin: z.boolean(),
		accepted: z.boolean(),
	})
	.meta({
		id: "Invitation",
		description: "Invitation to join a share instance.",
	});

export type Invitation = z.infer<typeof InvitationSchema>;
