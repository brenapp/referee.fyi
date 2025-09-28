import { Cloudflare } from "cloudflare";
import { importKey, KEY_PREFIX, verifyKeySignature } from "./crypto";
import {
  getAssetMeta,
  getInstance,
  getInvitation,
  getUser,
  isSystemKey,
} from "./data";
import { Invitation, ShareInstanceMeta, User } from "@referee-fyi/share";
import { createMiddleware } from "hono/factory";
import { AppArgs, ErrorResponseSchema } from "../router";
import z from "zod/v4";

export const VerifySignatureHeadersSchema = z.object({
  "X-Referee-Signature": z.string().optional(),
  "X-Referee-Public-Key": z.string().optional(),
  "X-Referee-Date": z.string().optional(),
});

export const VerifySignatureQuerySchema = z.object({
  signature: z.string().optional(),
  publickey: z.string().optional(),
  signature_date: z.string().optional(),
});

export const verifySignature = createMiddleware<AppArgs>(async (c, next) => {
  const now = new Date();

  const signature =
    c.req.header("X-Referee-Signature") ?? c.req.query("signature");
  const publicKeyRaw =
    c.req.header("X-Referee-Public-Key") ?? c.req.query("publickey");
  const isoDate =
    c.req.header("X-Referee-Date") ?? c.req.query("signature_date");

  if (
    typeof signature !== "string" ||
    typeof publicKeyRaw !== "string" ||
    typeof isoDate !== "string"
  ) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message:
            "Request must contain signature, public key, and date headers.",
        },
        code: "VerifySignatureValuesNotPresent",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const dateToVerify = new Date(isoDate);
  const skew = Math.abs(now.getTime() - dateToVerify.getTime());
  if (skew > 60 * 1000) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: `Skew between reported date (${dateToVerify.toISOString()}) and actual date (${now.toISOString()}) too large.`,
        },
        code: "VerifySignatureInvalidDateSkew",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const key = await importKey(publicKeyRaw);
  if (!key) {
    return c.json(
      {
        success: false,
        error: { name: "ValidationError", message: "Invalid public key." },
        code: "VerifySignatureInvalidPublicKey",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const body = await c.req.text();
  const canonicalURL = new URL(c.req.url);

  canonicalURL.searchParams.delete("signature");
  canonicalURL.searchParams.delete("publickey");
  canonicalURL.searchParams.delete("signature_date");
  canonicalURL.searchParams.sort();

  const message = [
    dateToVerify.toISOString(),
    c.req.method,
    canonicalURL.host,
    canonicalURL.pathname,
    canonicalURL.search,
    body,
  ].join("\n");

  const valid = await verifyKeySignature(key, signature, message);

  if (!valid) {
    return c.json(
      {
        success: false,
        error: { name: "ValidationError", message: "Invalid signature." },
        code: "VerifySignatureInvalidSignature",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  c.set("verifySignature", {
    key,
    keyHex: publicKeyRaw.slice(KEY_PREFIX.length),
    payload: body,
  });

  await next();
});

export const verifyUser = createMiddleware<AppArgs>(async (c, next) => {
  const keyHex = c.get("verifySignature")?.keyHex;

  if (!keyHex) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message:
            "Signature verification must be performed before user verification.",
        },
        code: "VerifySignatureValuesNotPresent",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  const user: User | null = await getUser(c.env, keyHex);

  if (!user) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "You must register to perform this action.",
        },
        code: "VerifyUserNotRegistered",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  c.set("verifyUser", { user });
  await next();
});

export const verifyUserHasSystemKey = createMiddleware<AppArgs>(
  async (c, next) => {
    const user = c.get("verifyUser")?.user;
    if (!user) {
      return c.json(
        {
          success: false,
          error: {
            name: "ValidationError",
            message: "User is not verified.",
          },
          code: "VerifyUserNotRegistered",
        } as const satisfies z.infer<typeof ErrorResponseSchema>,
        400
      );
    }

    const isSystem = await isSystemKey(c.env, user.key);
    if (!isSystem) {
      return c.json(
        {
          success: false,
          error: {
            name: "ValidationError",
            message: "You are not authorized to perform this action.",
          },
          code: "VerifyUserNotSystemKey",
        } as const satisfies z.infer<typeof ErrorResponseSchema>,
        403
      );
    }

    await next();
  }
);

export const verifyInvitation = createMiddleware<AppArgs>(async (c, next) => {
  const sku = c.req.param("sku");

  if (!sku) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "SKU parameter is required.",
        },
        code: "VerifyInvitationNotFound",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  const user = c.get("verifyUser")?.user;
  if (!user) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "User must be verified before invitation verification.",
        },
        code: "VerifySignatureValuesNotPresent",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  const invitation: Invitation | null = await getInvitation(
    c.env,
    user.key,
    sku
  );

  if (!invitation) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "User does not have an active invitation for that event.",
        },
        code: "VerifyInvitationNotFound",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      403
    );
  }

  // Allow bypassing the acceptance check if they are rejecting their own invitation
  const canBypassAcceptance =
    c.req.method === "DELETE" &&
    new URL(c.req.url).pathname === `/api/sync/${sku}/invite` &&
    c.req.query("user") === user.key;

  if (!invitation.accepted && !canBypassAcceptance) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message:
            "Cannot perform this action until this invitation is accepted.",
        },
        code: "VerifyInvitationNotAccepted",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      403
    );
  }
  const instance: ShareInstanceMeta | null = await getInstance(
    c.env,
    invitation.instance_secret,
    sku
  );

  if (!instance) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Could not get share instance.",
        },
        code: "VerifyInvitationInstanceNotFound",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      500
    );
  }

  c.set("verifyInvitation", { invitation, instance });
  await next();
});

export const VerifyIntegrationTokenParamsSchema = z.object({
  sku: z.string(),
});

export const VerifyIntegrationTokenQuerySchema = z.object({
  token: z.string().optional(),
  instance: z.string().optional(),
});

export const VerifyIntegrationTokenHeaderSchema = z.object({
  Authorization: z.string().optional(),
});

export const verifySystemToken = createMiddleware<AppArgs>(async (c, next) => {
  const sku = c.req.param("sku");
  const token =
    c.req.query("token") ||
    c.req.header("Authorization")?.replace("Bearer ", "");
  const instanceSecret = c.req.query("instance");

  // Skip to bearer token
  if (
    typeof token !== "string" ||
    typeof sku !== "string" ||
    typeof instanceSecret !== "string"
  ) {
    return await next();
  }

  /**
   * The format of the system token is a pipe delimited string:
   * 1. Public key of the system token
   * 2. Signed Message: <INSTANCE SECRET><SKU>
   **/
  const [publicKeyRaw, signedMessage] = token.split("|");

  // Verify Key
  const key = await importKey(publicKeyRaw);

  if (!key) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Invalid Bearer Token: can't obtain user key.",
        },
        code: "VerifyIntegrationTokenInvalidSignature",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const keyHex = publicKeyRaw.slice(KEY_PREFIX.length);
  const isSystem = await isSystemKey(c.env, keyHex);
  if (!isSystem) {
    return c.json(
      {
        success: false,
        error: { name: "ValidationError", message: "Key is not a system key." },
        code: "VerifyIntegrationTokenInvalidSignature",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const message = instanceSecret + sku;
  const valid = await verifyKeySignature(key, signedMessage, message);
  if (!valid) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Invalid Bearer Token: signature verification failed.",
        },
        code: "VerifyIntegrationTokenInvalidSignature",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const instance = await getInstance(c.env, instanceSecret, sku);
  if (!instance) {
    return c.json(
      {
        success: false,
        error: { name: "ValidationError", message: "Instance not found." },
        code: "VerifyIntegrationTokenInvalidInstance",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      404
    );
  }

  const user = await getUser(c.env, keyHex);
  if (!user) {
    return c.json(
      {
        success: false,
        error: { name: "ValidationError", message: "User not found." },
        code: "VerifyIntegrationTokenInvalidUser",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      404
    );
  }

  const invitation: Invitation = {
    accepted: true,
    admin: true,
    from: keyHex,
    id: "system:" + crypto.randomUUID(),
    sku,
    instance_secret: instanceSecret,
    user: keyHex,
  };

  c.set("verifyIntegrationToken", {
    grantType: "system",
    user,
    invitation,
    instance,
  });
  await next();
});

export const verifyBearerToken = createMiddleware<AppArgs>(async (c, next) => {
  const sku = c.req.param("sku");
  const token =
    c.req.query("token") ||
    c.req.header("Authorization")?.replace("Bearer ", "");

  if (typeof token !== "string" || typeof sku !== "string") {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Bearer token and SKU are both required.",
        },
        code: "VerifyIntegrationTokenValuesNotPresent",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  /**
   * The format of the bearer token is a pipe delimited string:
   * 1. Public key of an admin user that is responsible for the integration
   * 2. Signed Message: <Invitation ID><SKU>
   **/
  const [publicKeyRaw, signedMessage] = token.split("|");

  // Verify Key
  const key = await importKey(publicKeyRaw);
  if (!key) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Invalid Bearer Token: can't obtain user key.",
        },
        code: "VerifyIntegrationTokenInvalidSignature",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const keyHex = publicKeyRaw.slice(KEY_PREFIX.length);
  const invitation = await getInvitation(c.env, keyHex, sku);

  if (!invitation) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message:
            "Invalid Bearer Token: User does not have active invitation.",
        },
        code: "VerifyIntegrationTokenInvalidInvitation",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  if (!invitation.admin) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message:
            "Invalid Bearer Token: User does not have admin permissions.",
        },
        code: "VerifyIntegrationTokenInvalidUser",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const message = invitation.id + sku;
  const valid = await verifyKeySignature(key, signedMessage, message);

  if (!valid) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Invalid Bearer Token: Invalid signature.",
        },
        code: "VerifyIntegrationTokenInvalidSignature",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const instance = await getInstance(c.env, invitation.instance_secret, sku);

  if (!instance) {
    return c.json(
      {
        success: false,
        error: { name: "ValidationError", message: "Unknown Share Instance." },
        code: "VerifyIntegrationTokenInvalidInstance",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  const user = await getUser(c.env, keyHex);
  if (!user) {
    return c.json(
      {
        success: false,
        error: { name: "ValidationError", message: "Unknown User." },
        code: "VerifyIntegrationTokenInvalidUser",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  c.set("verifyIntegrationToken", {
    grantType: "bearer",
    user,
    invitation,
    instance,
  });

  await next();
});

export const verifyIntegrationToken = createMiddleware<AppArgs>(
  async (c, next) => {
    const sku = c.req.param("sku");
    const token =
      c.req.query("token") ||
      c.req.header("Authorization")?.replace("Bearer ", "");
    const instanceSecret = c.req.query("instance");

    if (typeof sku !== "string" || typeof token !== "string") {
      return c.json(
        {
          success: false,
          error: {
            name: "ValidationError",
            message: "SKU and token parameters are required.",
          },
          code: "VerifyIntegrationTokenValuesNotPresent",
        } as const satisfies z.infer<typeof ErrorResponseSchema>,
        400
      );
    }

    if (typeof instanceSecret === "string") {
      return await verifySystemToken(c, next);
    }

    return await verifyBearerToken(c, next);
  }
);

export const VerifyUserAssetAuthorizedQuerySchema = z.object({
  id: z.string(),
});

export const verifyUserAssetAuthorized = createMiddleware<AppArgs>(
  async (c, next) => {
    const id = c.req.query("id");
    if (typeof id !== "string") {
      return c.json(
        {
          success: false,
          error: { name: "ValidationError", message: "Missing asset ID" },
          code: "VerifyUserAssetAuthorizedValuesNotPresent",
        } as const satisfies z.infer<typeof ErrorResponseSchema>,
        400
      );
    }

    const meta = await getAssetMeta(c.env, id);
    if (!meta || !meta.images_id) {
      return c.json(
        {
          success: false,
          error: { name: "ValidationError", message: "Asset not found" },
          code: "VerifyUserAssetAuthorizedAssetNotFound",
        } as const satisfies z.infer<typeof ErrorResponseSchema>,
        404
      );
    }

    const ownerInvitation = await getInvitation(c.env, meta.owner, meta.sku);
    const verifyInvitation = c.get("verifyInvitation");
    const verifyIntegrationToken = c.get("verifyIntegrationToken");

    if (!verifyInvitation && !verifyIntegrationToken) {
      return c.json(
        {
          success: false,
          error: {
            name: "ValidationError",
            message: "Invitation must be verified before asset authorization.",
          },
          code: "VerifyUserAssetAuthorizedValuesNotPresent",
        } as const satisfies z.infer<typeof ErrorResponseSchema>,
        403
      );
    }

    if (verifyInvitation) {
      const isSystem = await isSystemKey(
        c.env,
        verifyInvitation.invitation.user
      );

      const isSameInstance =
        ownerInvitation &&
        ownerInvitation.accepted &&
        ownerInvitation.instance_secret ===
          verifyInvitation.invitation.instance_secret;

      if (!isSystem && !isSameInstance) {
        return c.json(
          {
            success: false,
            error: {
              name: "ValidationError",
              message:
                "Asset owner is not on the same instance as the requester.",
            },
            code: "VerifyUserAssetAuthorizedUserNotAuthorized",
          } as const satisfies z.infer<typeof ErrorResponseSchema>,
          403
        );
      }
    }

    if (verifyIntegrationToken) {
      const isSystem = verifyIntegrationToken.grantType === "system";

      const isSameInstance =
        ownerInvitation &&
        ownerInvitation.accepted &&
        ownerInvitation.instance_secret ===
          verifyIntegrationToken.invitation.instance_secret;

      if (!isSystem && !isSameInstance) {
        return c.json(
          {
            success: false,
            error: {
              name: "ValidationError",
              message:
                "Asset owner is not on the same instance as the requester.",
            },
            code: "VerifyUserAssetAuthorizedUserNotAuthorized",
          } as const satisfies z.infer<typeof ErrorResponseSchema>,
          403
        );
      }
    }

    const client = new Cloudflare({
      apiEmail: c.env.CLOUDFLARE_EMAIL,
      apiToken: await c.env.CLOUDFLARE_API_KEY.get(),
    });

    const image = await client.images.v1.get(meta.images_id, {
      account_id: c.env.CLOUDFLARE_IMAGES_ACCOUNT_ID,
    });

    if (Object.hasOwn(image, "draft") || !image.uploaded) {
      return c.json(
        {
          success: false,
          error: {
            name: "ValidationError",
            message: "Image has been created, but not yet uploaded.",
          },
          code: "VerifyUserAssetAuthorizedImageNotFound",
        } as const satisfies z.infer<typeof ErrorResponseSchema>,
        404
      );
    }

    c.set("verifyUserAssetAuthorized", { asset: meta, image });

    await next();
  }
);

export const verifyInvitationAdmin = createMiddleware<AppArgs>(
  async (c, next) => {
    const verifyInvitation = c.get("verifyInvitation");
    if (!verifyInvitation) {
      return c.json(
        {
          success: false,
          error: {
            name: "ValidationError",
            message: "You are not authorized to perform this action.",
          },
          code: "VerifyInvitationAdminNotAuthorized",
        } as const satisfies z.infer<typeof ErrorResponseSchema>,
        400
      );
    }

    const isAdmin = verifyInvitation.invitation.admin;
    const systemKey = await isSystemKey(
      c.env,
      verifyInvitation.invitation.user
    );

    if (!isAdmin && !systemKey) {
      return c.json(
        {
          success: false,
          error: {
            name: "ValidationError",
            message: "You are not authorized to perform this action.",
          },
          code: "VerifyInvitationAdminNotAuthorized",
        } as const satisfies z.infer<typeof ErrorResponseSchema>,
        403
      );
    }

    c.set("verifyInvitationAdmin", { admin: isAdmin, systemKey });
    await next();
  }
);
