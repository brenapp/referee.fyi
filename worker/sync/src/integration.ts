import { IRequest, AutoRouter } from "itty-router";
import { Env } from "./types";
import { response } from "./utils/request";
import { getInstance, getInvitation, getUser } from "./utils/data";
import { importKey, KEY_PREFIX, verifyKeySignature } from "./utils/crypto";
import { Invitation, ShareInstanceMeta, User } from "@referee-fyi/share";

const verifyBearerToken = async (request: IRequest, env: Env) => {
  const sku = request.params.sku;
  const token = request.query.token;

  if (typeof token !== "string" || typeof sku !== "string") {
    return response({
      success: false,
      reason: "bad_request",
      details: `Must specify bearer token and sku`,
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

const integrationRouter = AutoRouter<IRequest, [Env]>({
  base: "/api/integration/v1/:sku",
  before: [verifyBearerToken],
});

type VerifiedRequest = IRequest & {
  user: User;
  invitation: Invitation;
  instance: ShareInstanceMeta;
};

// Integration API (just requires bearer token)
integrationRouter
  .get("/verify", async () => {
    return response({ success: true, data: "Valid Bearer Token" });
  })
  .get("/incidents.json", async (request: VerifiedRequest, env: Env) => {
    const id = env.INCIDENTS.idFromString(request.instance.secret);
    const stub = env.INCIDENTS.get(id);
    return stub.handleJSON();
  })
  .get("/incidents.csv", async (request: VerifiedRequest, env: Env) => {
    const id = env.INCIDENTS.idFromString(request.instance.secret);
    const stub = env.INCIDENTS.get(id);
    return stub.handleCSV();
  });

export { integrationRouter };
