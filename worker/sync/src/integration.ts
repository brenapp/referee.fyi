import { IRequest, Router } from "itty-router";
import { Env } from "./types";
import { response } from "./utils";
import { getInstance, getInvitation, getUser } from "./data";
import { importKey, KEY_PREFIX, verifyKeySignature } from "./crypto";
import { Invitation, ShareInstance, User } from "~types/server";

const integrationRouter = Router<IRequest, [Env]>();

const verifyBearerToken = async (request: IRequest, env: Env) => {
  const sku = request.params.sku;
  const token = request.query.token;

  if (typeof token !== "string" || typeof sku !== "string") {
    return response({
      success: false,
      reason: "bad_request",
      details: "Must specify bearer token and sku.",
    });
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
    return response({
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: can't obtain user key.",
    });
  }

  const keyHex = publicKeyRaw.slice(KEY_PREFIX.length);
  const invitation = await getInvitation(env, keyHex, sku);

  if (!invitation) {
    return response({
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: User does not active invitation.",
    });
  }

  if (!invitation.admin) {
    return response({
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: User does not have admin permissions.",
    });
  }

  const message = invitation.id + sku;
  const valid = await verifyKeySignature(key, signedMessage, message);

  if (!valid) {
    return response({
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: Invalid signature.",
    });
  }

  const instance = await getInstance(env, invitation.instance_secret, sku);

  if (!instance) {
    return response({
      success: false,
      reason: "bad_request",
      details: "Unknown Share Instance.",
    });
  }

  request.user = await getUser(env, keyHex);
  request.invitation = invitation;
  request.instance = instance;
};

type VerifiedRequest = IRequest & {
  user: User;
  invitation: Invitation;
  instance: ShareInstance;
};

// Integration API (just requires bearer token)
integrationRouter
  .all("/api/integration/v1/:sku/*", verifyBearerToken)
  .get("/api/integration/v1/:sku/verify", async () => {
    return response({ success: true, data: "Valid Bearer Token" });
  })
  .get(
    "/api/integration/v1/:sku/incidents.json",
    async (request: VerifiedRequest, env: Env) => {
      const id = env.INCIDENTS.idFromString(request.instance.secret);
      const stub = env.INCIDENTS.get(id);

      const headers = new Headers(request.headers);

      headers.set("X-Referee-Content", request.payload);
      headers.set("X-Referee-User-Name", request.user.name);
      headers.set("X-Referee-User-Key", request.user.key);

      return stub.fetch(`https://share/json`, {
        headers,
      });
    }
  )
  .get(
    "/api/integration/v1/:sku/incidents.csv",
    async (request: VerifiedRequest, env: Env) => {
      const id = env.INCIDENTS.idFromString(request.instance.secret);
      const stub = env.INCIDENTS.get(id);

      const headers = new Headers(request.headers);

      headers.set("X-Referee-Content", request.payload);
      headers.set("X-Referee-User-Name", request.user.name);
      headers.set("X-Referee-User-Key", request.user.key);

      return stub.fetch(`https://share/csv`, {
        headers,
      });
    }
  );

export { integrationRouter };
