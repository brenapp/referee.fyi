import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../../../router";
import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { z } from "zod/v4";
import {
  verifyInvitation,
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
  verifyUserAssetAuthorized,
  VerifyUserAssetAuthorizedQuerySchema,
} from "../../../utils/verify";
import { signAssetUrl } from "../../../utils/crypto";
import { env } from "cloudflare:workers";

export const ParamsSchema = z.object({
  sku: z.string(),
});
export const QuerySchema = VerifyUserAssetAuthorizedQuerySchema;

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      owner: z.string(),
      url: z.string(),
    }),
  })
  .meta({
    id: "GetAssetURLResponse",
  });

export const route = createRoute({
  method: "get",
  path: "/api/{sku}/asset/url",
  tags: ["Assets"],
  summary: "Gets the signed URL for an asset.",
  hide: env.ENVIRONMENT !== "staging",
  middleware: [
    verifySignature,
    verifyUser,
    verifyInvitation,
    verifyUserAssetAuthorized,
  ],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Successfully retrieved signed asset URL",
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
  const verifyUserAssetAuthorized = c.get("verifyUserAssetAuthorized");
  if (!verifyUserAssetAuthorized) {
    return c.json(
      {
        success: false,
        code: "VerifyUserAssetAuthorizedValuesNotPresent",
        error: {
          name: "ValidationError",
          message: "User is not authorized to access this asset.",
        },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const url = verifyUserAssetAuthorized.image.variants?.find((variant) =>
    variant.endsWith("public")
  );
  if (!url) {
    return c.json(
      {
        success: false,
        code: "GetAssetURLNotFound",
        error: {
          name: "ValidationError",
          message: "Preview not found for the asset.",
        },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      404
    );
  }

  const signed = await signAssetUrl(
    url,
    c.env.CLOUDFLARE_IMAGES_SIGNATURE_TOKEN,
    60 * 5
  );

  const owner = verifyUserAssetAuthorized.asset.owner;
  return c.json(
    {
      success: true,
      data: {
        owner,
        url: signed.toString(),
      },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};
