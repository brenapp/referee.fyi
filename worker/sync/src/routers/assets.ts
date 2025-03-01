import { Cloudflare } from "cloudflare";
import { AutoRouter } from "itty-router";
import { Env, RequestHasInvitation } from "../types";
import { verifyInvitation, verifySignature, verifyUser } from "../utils/verify";
import { response } from "../utils/request";
import { getInvitation, ImageAssetMeta, setAssetMeta } from "../utils/data";
import {
  ApiGetAssetOriginalURLResponseBody,
  ApiGetAssetPreviewURLResponseBody,
  APIGetAssetUploadURLResponseBody,
} from "@referee-fyi/share";
import { signAssetUrl } from "../utils/crypto";

const assetRouter = AutoRouter<RequestHasInvitation, [Env]>({
  before: [verifySignature, verifyUser, verifyInvitation],
});

assetRouter.get(
  "/api/:sku/asset/upload_url",
  async (request: RequestHasInvitation, env: Env) => {
    const sku = request.params.sku;
    const type = request.query.type;
    const id = request.query.id;

    if (typeof id !== "string") {
      return response({
        success: false,
        reason: "bad_request",
        details: "Missing asset ID",
      });
    }

    if (type !== "image") {
      return response({
        success: false,
        reason: "bad_request",
        details: "Unsupported asset type",
      });
    }

    // We will allow the owner to overwrite the asset, but not others.
    const current = await env.ASSETS.get<ImageAssetMeta>(id, "json");
    if (current && current.owner !== request.user.key) {
      return response({
        success: false,
        reason: "bad_request",
        details: "Asset already exists",
      });
    }

    const imageMeta: Omit<ImageAssetMeta, "images_id"> = {
      id,
      type: "image",
      owner: request.user.key,
      sku,
    };

    const client = new Cloudflare({
      apiEmail: env.CLOUDFLARE_EMAIL,
      apiToken: env.CLOUDFLARE_API_KEY,
    });

    const directUploadResponse = await client.images.v2.directUploads.create({
      account_id: env.CLOUDFLARE_IMAGES_ACCOUNT_ID,
      metadata: JSON.stringify(imageMeta),
      requireSignedURLs: true,
    });

    if (!directUploadResponse.id || !directUploadResponse.uploadURL) {
      return response({
        success: false,
        reason: "server_error",
        details: "Failed to create direct upload",
      });
    }

    const meta: ImageAssetMeta = {
      ...imageMeta,
      images_id: directUploadResponse.id,
    };

    await setAssetMeta(env, meta);

    return response<APIGetAssetUploadURLResponseBody>({
      success: true,
      data: {
        uploadURL: directUploadResponse.uploadURL,
      },
    });
  }
);

type RequestHasAssetAuthorization = RequestHasInvitation & {
  asset: ImageAssetMeta;
  image: Cloudflare.Images.V1.Image;
};

async function ensureImageAuthorized(request: RequestHasInvitation, env: Env) {
  const id = request.params.id;

  const meta = await env.ASSETS.get<ImageAssetMeta>(id, "json");

  if (!meta || !meta.images_id) {
    return response({
      success: false,
      reason: "bad_request",
      details: "Asset not found",
    });
  }

  // The owner of the asset must be on the same instance as the requester.
  const ownerInvitation = await getInvitation(env, meta.owner, meta.sku);
  if (
    !ownerInvitation ||
    !ownerInvitation.accepted ||
    ownerInvitation.instance_secret !== request.invitation.instance_secret
  ) {
    return response({
      success: false,
      reason: "bad_request",
      details: "Unauthorized",
    });
  }

  const client = new Cloudflare({
    apiEmail: env.CLOUDFLARE_EMAIL,
    apiToken: env.CLOUDFLARE_API_KEY,
  });

  const image = await client.images.v1.get(meta.images_id, {
    account_id: env.CLOUDFLARE_IMAGES_ACCOUNT_ID,
  });

  if (Object.hasOwn(image, "draft") || !image.uploaded) {
    return response({
      success: false,
      reason: "bad_request",
      details: "Image not uploaded",
    });
  }

  request.asset = meta;
  request.image = image;
}

assetRouter.get(
  "/api/:sku/asset/:id/preview_url",
  ensureImageAuthorized,
  async (request: RequestHasAssetAuthorization) => {
    const url = request.image.variants?.find((variant) =>
      variant.endsWith("preview")
    );
    if (!url) {
      return response({
        success: false,
        reason: "bad_request",
        details: "Preview not found",
      });
    }

    return response<ApiGetAssetPreviewURLResponseBody>({
      success: true,
      data: {
        owner: request.asset.owner,
        previewURL: url,
      },
    });
  }
);

assetRouter.get(
  "/api/:sku/asset/:id/url",
  ensureImageAuthorized,
  async (request: RequestHasAssetAuthorization, env: Env) => {
    const url = request.image.variants?.find((variant) =>
      variant.endsWith("public")
    );
    if (!url) {
      return response({
        success: false,
        reason: "bad_request",
        details: "Preview not found",
      });
    }

    const signed = await signAssetUrl(
      url,
      env.CLOUDFLARE_IMAGES_SIGNATURE_TOKEN,
      60 * 5
    );

    return response<ApiGetAssetOriginalURLResponseBody>({
      success: true,
      data: {
        owner: request.asset.owner,
        url: signed.toString(),
      },
    });
  }
);

export { assetRouter };
