import { z } from "zod/v4";
import {
  AppArgs,
  ErrorResponses,
  ErrorResponseSchema,
} from "../../../../router";
import {
  verifyIntegrationToken,
  VerifyIntegrationTokenParamsSchema,
  VerifyIntegrationTokenQuerySchema,
  verifyUserAssetAuthorized,
  VerifyUserAssetAuthorizedQuerySchema,
} from "../../../../utils/verify";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { signAssetUrl } from "../../../../utils/crypto";
import { AssetTypeSchema, UserSchema } from "@referee-fyi/share";
import { getUser } from "../../../../utils/data";

export const ParamsSchema = VerifyIntegrationTokenParamsSchema;
export const QuerySchema = z.object({
  ...VerifyUserAssetAuthorizedQuerySchema.shape,
  ...VerifyIntegrationTokenQuerySchema.shape,
});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      type: AssetTypeSchema,
      owner: UserSchema,
      sku: z.string(),
      url: z.url(),
      expires_at: z.string(),
    }),
  })
  .meta({
    id: "GetIntegrationV1AssetResponse",
  });

export const route = createRoute({
  method: "get",
  path: "/api/integration/v1/{sku}/asset",
  tags: ["Integration API"],
  summary: "Gets information about an asset.",
  middleware: [verifyIntegrationToken, verifyUserAssetAuthorized],
  request: {
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Asset information",
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
      400
    );
  }

  const verifyUserAssetAuthorized = c.get("verifyUserAssetAuthorized");
  if (!verifyUserAssetAuthorized) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "You are not authorized to access this asset.",
        },
        code: "VerifyUserAssetAuthorizedUserNotAuthorized",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  const url = verifyUserAssetAuthorized.image.variants?.find((variant) =>
    variant.endsWith("public")
  );
  if (!url) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Could not find a public asset variant.",
        },
        code: "VerifyUserAssetAuthorizedImageNotFound",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  const signed = await signAssetUrl(
    url,
    await c.env.CLOUDFLARE_IMAGES_SIGNATURE_TOKEN.get(),
    60 * 5
  );

  const owner = await getUser(c.env, verifyUserAssetAuthorized.asset.owner);
  if (!owner) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Could not find asset owner.",
        },
        code: "VerifyUserNotRegistered",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  return c.json(
    {
      success: true,
      data: {
        type: "image",
        owner,
        sku: c.req.param("sku"),
        url: signed.toString(),
        expires_at: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
      },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};

export default [route, handler] as const;
