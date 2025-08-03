import { importKey, KEY_PREFIX, verifyKeySignature } from "./crypto";
import { getInstance, getInvitation, getUser } from "./data";
import { Invitation, ShareInstanceMeta, User } from "@referee-fyi/share";
import { createMiddleware } from "hono/factory";
import { ErrorResponseSchema, Variables } from "../router";
import z from "zod/v4";
import { getSystemKeyMetadata } from "./systemKey";

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

export const verifySignature = createMiddleware<{
  Variables: Variables;
}>(async (c, next) => {
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
        error: "Request must contain signature, public key, and date headers.",
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
        error: `Skew between reported date (${dateToVerify.toISOString()}) and actual date (${now.toISOString()}) too large.`,
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
        error: "Invalid public key.",
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
        error: "Invalid signature.",
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

export const verifyUser = createMiddleware<{
  Variables: Variables;
  Bindings: Env;
}>(async (c, next) => {
  const keyHex = c.get("verifySignature")?.keyHex;

  if (!keyHex) {
    return c.json(
      {
        success: false,
        error:
          "Signature verification must be performed before user verification.",
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
        error: "You must register to perform this action.",
        code: "VerifyUserNotRegistered",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  c.set("verifyUser", { user });
  await next();
});

export const verifyInvitation = createMiddleware<{
  Variables: Variables;
  Bindings: Env;
}>(async (c, next) => {
  const sku = c.req.param("sku");

  if (!sku) {
    return c.json(
      {
        success: false,
        error: "SKU parameter is required.",
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
        error: "User must be verified before invitation verification.",
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
        error: "User does not have an active invitation for that event.",
        code: "VerifyInvitationNotFound",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      403
    );
  }

  // Allow bypassing the acceptance check if they are rejecting their own invitation
  const canBypassAcceptance =
    c.req.method === "DELETE" &&
    new URL(c.req.url).pathname === `/api/${sku}/invite` &&
    c.req.query("user") === user.key;

  if (!invitation.accepted && !canBypassAcceptance) {
    return c.json(
      {
        success: false,
        error: "Cannot perform this action until this invitation is accepted.",
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
        error: "Could not get share instance.",
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
  token: z.string(),
  instance: z.string().optional(),
});

export const verifySystemToken = createMiddleware<{
  Variables: Variables;
  Bindings: Env;
}>(async (c, next) => {
  const sku = c.req.param("sku");
  const token = c.req.query("token");
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
        error: "Invalid Bearer Token: can't obtain user key.",
        code: "VerifyIntegrationTokenInvalidSignature",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const keyHex = publicKeyRaw.slice(KEY_PREFIX.length);
  const metadata = await getSystemKeyMetadata(c.env, keyHex);
  if (!metadata) {
    return c.json(
      {
        success: false,
        error: "Key is not a system key.",
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
        error: "Invalid Bearer Token: signature verification failed.",
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
        error: "Instance not found.",
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
        error: "User not found.",
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

export const verifyBearerToken = createMiddleware<{
  Variables: Variables;
  Bindings: Env;
}>(async (c, next) => {
  const sku = c.req.param("sku");
  const token = c.req.query("token");

  if (typeof token !== "string" || typeof sku !== "string") {
    return c.json(
      {
        success: false,
        error: "Token and SKU parameters are required.",
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
        error: "Invalid Bearer Token: can't obtain user key.",
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
        error: "Invalid Bearer Token: User does not have active invitation.",
        code: "VerifyIntegrationTokenInvalidInvitation",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  if (!invitation.admin) {
    return c.json(
      {
        success: false,
        error: "Invalid Bearer Token: User does not have admin permissions.",
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
        error: "Invalid Bearer Token: Invalid signature.",
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
        error: "Unknown Share Instance.",
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
        error: "Unknown User.",
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

export const verifyIntegrationToken = createMiddleware<{
  Variables: Variables;
  Bindings: Env;
}>(async (c, next) => {
  const sku = c.req.param("sku");
  const token = c.req.query("token");
  const instanceSecret = c.req.query("instance");

  if (typeof sku !== "string" || typeof token !== "string") {
    return c.json(
      {
        success: false,
        error: "SKU and token parameters are required.",
        code: "VerifyIntegrationTokenValuesNotPresent",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      400
    );
  }

  if (typeof instanceSecret !== "string") {
    return await verifySystemToken(c, next);
  }

  return await verifyBearerToken(c, next);
});
