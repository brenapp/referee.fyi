import { AutoRouter } from "itty-router";
import { verifySignature, verifyUser } from "../utils/verify";
import { AuthenticatedRequest, Env } from "../types";
import { response } from "../utils/request";
import {
  APIGetInvitationRequestResponseBody,
  APIPutInvitationRequestResponseBody,
  Invitation,
} from "@referee-fyi/share";
import {
  getInvitation,
  getRequestCodeUserKey,
  getUser,
  setRequestCode,
} from "../utils/data";

const keyExchangeRouter = AutoRouter<AuthenticatedRequest, [Env]>({
  before: [verifySignature, verifyUser],
});

keyExchangeRouter
  .put("/api/:sku/request", async (request: AuthenticatedRequest, env: Env) => {
    const sku = request.params.sku;
    const version = request.query.version;

    if (typeof sku !== "string" || typeof version !== "string") {
      return response({
        success: false,
        reason: "bad_request",
        details: "Must specify SKU and Version",
      });
    }

    const invitation: Invitation | null = await getInvitation(
      env,
      request.user.key,
      sku
    );

    if (invitation) {
      return response({
        success: false,
        reason: "bad_request",
        details: "You must leave your current instance first.",
      });
    }

    const buffer = new Uint8Array(2);
    crypto.getRandomValues(buffer);

    const code = Array.from(new Uint8Array(buffer), (x) =>
      x.toString(16).padStart(2, "0")
    )
      .join("")
      .toUpperCase();

    await setRequestCode(
      env,
      code,
      sku,
      { key: request.user.key, version },
      {
        expirationTtl: 600,
      }
    );

    return response<APIPutInvitationRequestResponseBody>({
      success: true,
      data: {
        code,
        ttl: 600,
      },
    });
  })

  .get("/api/:sku/request", async (request: AuthenticatedRequest, env: Env) => {
    const sku = request.params.sku;
    const code = request.query.code;

    if (typeof sku !== "string" || typeof code !== "string") {
      return response({
        success: false,
        reason: "bad_request",
        details: "Must specify SKU and Request Code",
      });
    }

    const req = await getRequestCodeUserKey(env, code, sku);
    if (!req) {
      return response({
        success: false,
        reason: "incorrect_code",
        details: "No such request code.",
      });
    }
    const { key, version } = req;

    const user = await getUser(env, key);

    return response<APIGetInvitationRequestResponseBody>({
      success: true,
      data: { user: user ?? { key, name: "<Unknown User>" }, version },
    });
  });

export { keyExchangeRouter };
