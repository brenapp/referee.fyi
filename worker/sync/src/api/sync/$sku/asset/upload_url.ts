import { Cloudflare } from "cloudflare";
import {
  ErrorResponseSchema,
  ErrorResponses,
  AppArgs,
} from "../../../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifyInvitation,
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../../../utils/verify";
import { ImageAssetMeta } from "@referee-fyi/share";
import { getAssetMeta, setAssetMeta } from "../../../../utils/data";
export const ParamsSchema = z.object({
  sku: z.string(),
});
export const QuerySchema = z.object({
  type: z.enum(["image"]),
  id: z.string(),
});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      uploadURL: z.string(),
    }),
  })
  .meta({
    id: "GetAssetUploadURLResponse",
  });

export const route = createRoute({
  method: "get",
  path: "/api/{sku}/asset/upload_url",
  tags: ["Assets"],
  summary: "Gets an upload URL for an asset.",
  hide: process.env.WRANGLER_ENVIRONMENT === "production",
  middleware: [verifySignature, verifyUser, verifyInvitation],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Successfully retrieved asset upload URL",
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
  const { sku } = c.req.valid("param");
  const { type, id } = c.req.valid("query");

  if (type !== "image") {
    return c.json(
      {
        success: false,
        code: "GetAssetUploadURLInvalidAssetType",
        error: { name: "ValidationError", message: "Unsupported asset type" },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  const verifyInvitation = c.get("verifyInvitation");
  if (!verifyInvitation) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Invitation verification failed.",
        },
        code: "VerifyInvitationNotFound",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  // We will allow the owner to overwrite the asset, but not others.
  const current = await getAssetMeta(c.env, id);
  if (current && current.owner !== verifyInvitation.invitation.user) {
    return c.json(
      {
        success: false,
        code: "GetAssetUploadURLAssetAlreadyExists",
        error: { name: "ValidationError", message: "Asset already exists" },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  const imageMeta: Omit<ImageAssetMeta, "images_id"> = {
    id,
    type: "image",
    owner: verifyInvitation.invitation.user,
    sku,
  };

  const client = new Cloudflare({
    apiEmail: c.env.CLOUDFLARE_EMAIL,
    apiToken: await c.env.CLOUDFLARE_API_KEY.get(),
  });

  const directUploadResponse = await client.images.v2.directUploads.create({
    account_id: c.env.CLOUDFLARE_IMAGES_ACCOUNT_ID,
    metadata: JSON.stringify(imageMeta),
    requireSignedURLs: true,
  });

  if (!directUploadResponse.id || !directUploadResponse.uploadURL) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Failed to create direct upload",
        },
        code: "GetAssetUploadURLInvalidAssetType",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      500
    );
  }

  const meta: ImageAssetMeta = {
    ...imageMeta,
    images_id: directUploadResponse.id,
  };

  await setAssetMeta(c.env, meta);

  return c.json(
    {
      success: true,
      data: { uploadURL: directUploadResponse.uploadURL },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};

export default [route, handler] as const;
