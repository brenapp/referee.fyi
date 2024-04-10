import { IRequest } from "itty-router";
import { response } from "./request";
import {
  AuthenticatedRequest,
  Env,
  Invitation,
  RequestHasInvitation,
  ShareInstance,
  SignedRequest,
  User,
} from "../../types/server";
import { getInstance, getInvitation, getUser } from "./data";

export const KEY_PREFIX = "ECDSA:";
export const KEY_ALGORITHM = { name: "ECDSA", namedCurve: "P-384" };

export function ingestHex(hex: string): Uint8Array | null {
  const keyBuffer = new Uint8Array(hex.length / 2);

  for (let i = 0; i < hex.length; i += 2) {
    const value = Number.parseInt(hex[i] + hex[i + 1], 16);

    if (!Number.isFinite(value)) {
      return null;
    }

    keyBuffer[i / 2] = value;
  }

  return keyBuffer;
}

export const verifySignature = async (request: IRequest & Request) => {
  const now = new Date();

  const signature =
    request.headers.get("X-Referee-Signature") ?? request.query.signature;
  const publicKeyRaw =
    request.headers.get("X-Referee-Public-Key") ?? request.query.publickey;
  const isoDate =
    request.headers.get("X-Referee-Date") ?? request.query.signature_date;

  if (
    typeof signature !== "string" ||
    typeof publicKeyRaw !== "string" ||
    typeof isoDate !== "string"
  ) {
    return response({
      success: false,
      reason: "incorrect_code",
      details: "Request must contain signature, public key, and date headers.",
    });
  }

  const dateToVerify = new Date(isoDate);

  const skew = Math.abs(now.getTime() - dateToVerify.getTime());
  if (skew > 60 * 1000) {
    return response({
      success: false,
      reason: "bad_request",
      details: `Skew between reported date (${dateToVerify.toISOString()}) and actual date (${now.toISOString()}) too large.`,
    });
  }

  if (!publicKeyRaw.startsWith(KEY_PREFIX)) {
    return response({
      success: false,
      reason: "bad_request",
      details: "Incorrect public key form.",
    });
  }

  const keyBuffer = ingestHex(publicKeyRaw.slice(KEY_PREFIX.length));

  if (!keyBuffer) {
    return response({
      success: false,
      reason: "bad_request",
      details: "Invalid public key.",
    });
  }

  let key: CryptoKey | null = null;
  try {
    key = await crypto.subtle.importKey("raw", keyBuffer, KEY_ALGORITHM, true, [
      "verify",
    ]);
  } catch (e) {
    return response({
      success: false,
      reason: "bad_request",
      details: "Invalid public key.",
    });
  }

  if (!key) {
    return response({
      success: false,
      reason: "bad_request",
      details: "Invalid public key.",
    });
  }

  const body = await request.text();

  const canonicalURL = new URL(request.url);
  canonicalURL.searchParams.delete("signature");
  canonicalURL.searchParams.delete("publickey");
  canonicalURL.searchParams.delete("signature_date");
  canonicalURL.searchParams.sort();

  const message = [
    dateToVerify.toISOString(),
    request.method,
    canonicalURL.host,
    canonicalURL.pathname,
    canonicalURL.search,
    body,
  ].join("\n");

  const encoder = new TextEncoder();

  const messageBuffer = encoder.encode(message);
  const signatureBuffer = ingestHex(signature);

  if (!signatureBuffer) {
    return response({
      success: false,
      reason: "incorrect_code",
      details: "Invalid signature.",
    });
  }

  const valid = await crypto.subtle.verify(
    { ...KEY_ALGORITHM, hash: "SHA-256" },
    key,
    signatureBuffer,
    messageBuffer
  );

  if (!valid) {
    return response({
      success: false,
      reason: "incorrect_code",
      details: "Invalid signature.",
    });
  }

  request.key = key;
  request.keyHex = publicKeyRaw.slice(KEY_PREFIX.length);
  request.payload = body;
};

export const verifyUser = async (request: SignedRequest, env: Env) => {
  const user: User | null = await getUser(env, request.keyHex);

  if (!user) {
    return response({
      success: false,
      reason: "bad_request",
      details: "You must register to perform this action.",
    });
  }

  request.user = user;
};

export const verifyInvitation = async (
  request: AuthenticatedRequest,
  env: Env
) => {
  const sku = request.params.sku;

  const invitation: Invitation | null = await getInvitation(
    env,
    request.user.key,
    sku
  );

  if (!invitation) {
    return response({
      success: false,
      reason: "incorrect_code",
      details: "User does not have an active invitation for that event.",
    });
  }

  // Allow bypassing the acceptance check if they are rejecting their own invitation
  const canBypassAcceptance =
    request.method === "DELETE" &&
    new URL(request.url).pathname === `/api/${sku}/invite` &&
    request.query.user === request.keyHex;

  if (!invitation.accepted && !canBypassAcceptance) {
    return response({
      success: false,
      reason: "bad_request",
      details: "Cannot perform this action until this invitation is accepted.",
    });
  }
  const instance: ShareInstance | null = await getInstance(
    env,
    invitation.instance_secret,
    sku
  );

  if (!instance) {
    return response({
      success: false,
      reason: "server_error",
      details: "Could not get share instance.",
    });
  }

  request.invitation = invitation;
  request.instance = instance;
};

export const verifyAdmin = async (request: RequestHasInvitation) => {
  if (!request.invitation.admin) {
    return response({
      success: false,
      reason: "bad_request",
      details: "This action requires admin permissions.",
    });
  }
};
