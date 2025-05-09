import { IRequest, AutoRouter } from "itty-router";
import { Env } from "../types";
import { response } from "../utils/request";
import { getInstance, getInvitation, getUser } from "../utils/data";
import { importKey, KEY_PREFIX, verifyKeySignature } from "../utils/crypto";
import {
  Incident,
  Invitation,
  ShareInstanceMeta,
  ShareResponse,
  User,
} from "@referee-fyi/share";
import { generateIncidentReportPDF } from "@referee-fyi/pdf-export";
import { getRobotEventsClient } from "../utils/robotevents";
import { getSystemKeyMetadata } from "../utils/systemKey";

export type VerificationGrantType = "bearer" | "system";

export type VerifyCredentialResponse =
  | {
      success: true;
      user: User;
      invitation: Invitation;
      instance: ShareInstanceMeta;
    }
  | {
      success: false;
      reason: "bad_request" | "incorrect_code";
      details: string;
    };

const verifySystemToken = async (
  request: IRequest,
  env: Env
): Promise<VerifyCredentialResponse> => {
  const sku = request.params.sku;
  const token = request.query.token;
  const instanceSecret = request.query.instance;

  if (
    typeof token !== "string" ||
    typeof sku !== "string" ||
    typeof instanceSecret !== "string"
  ) {
    return {
      success: false,
      reason: "bad_request",
      details: `Must specify token and instance.`,
    };
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
    return {
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: can't obtain user key.",
    };
  }

  const keyHex = publicKeyRaw.slice(KEY_PREFIX.length);
  const metadata = await getSystemKeyMetadata(env, keyHex);
  if (!metadata) {
    return {
      success: false,
      reason: "incorrect_code",
      details: "Key is not system key",
    };
  }

  const message = instanceSecret + sku;
  console.log(message);
  const valid = await verifyKeySignature(key, signedMessage, message);

  if (!valid) {
    return {
      success: false,
      reason: "incorrect_code",
      details: "Invalid system token.",
    };
  }

  const instance = await getInstance(env, instanceSecret, sku);
  if (!instance) {
    return {
      success: false,
      reason: "bad_request",
      details: "Unknown Share Instance.",
    };
  }

  const user = await getUser(env, keyHex);
  if (!user) {
    return {
      success: false,
      reason: "bad_request",
      details: "Unknown User.",
    };
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

  return { success: true, user, invitation, instance };
};

const verifyBearerToken = async (
  request: IRequest,
  env: Env
): Promise<VerifyCredentialResponse> => {
  const sku = request.params.sku;
  const token = request.query.token;

  if (typeof token !== "string" || typeof sku !== "string") {
    return {
      success: false,
      reason: "bad_request",
      details: `Must specify bearer token and sku`,
    };
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
    return {
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: can't obtain user key.",
    };
  }

  const keyHex = publicKeyRaw.slice(KEY_PREFIX.length);
  const invitation = await getInvitation(env, keyHex, sku);

  if (!invitation) {
    return {
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: User does not active invitation.",
    };
  }

  if (!invitation.admin) {
    return {
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: User does not have admin permissions.",
    };
  }

  const message = invitation.id + sku;
  const valid = await verifyKeySignature(key, signedMessage, message);

  if (!valid) {
    return {
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: Invalid signature.",
    };
  }

  const instance = await getInstance(env, invitation.instance_secret, sku);

  if (!instance) {
    return {
      success: false,
      reason: "bad_request",
      details: "Unknown Share Instance.",
    };
  }

  const user = await getUser(env, keyHex);
  if (!user) {
    return {
      success: false,
      reason: "bad_request",
      details: "Unknown User.",
    };
  }

  return { success: true, user, invitation, instance };
};

const verify = async (request: IRequest, env: Env) => {
  const system = await verifySystemToken(request, env);

  if (system.success) {
    request.user = system.user;
    request.invitation = system.invitation;
    request.instance = system.instance;
    request.grantType = "system";
    return;
  }

  const bearer = await verifyBearerToken(request, env);
  if (bearer.success) {
    request.user = bearer.user;
    request.invitation = bearer.invitation;
    request.instance = bearer.instance;
    request.grantType = "bearer";
    return;
  }

  return bearer;
};

const integrationRouter = AutoRouter<IRequest, [Env]>({
  base: "/api/integration/v1/:sku",
  before: [verify],
});

type VerifiedRequest = IRequest & {
  user: User;
  invitation: Invitation;
  instance: ShareInstanceMeta;
  grantType: VerificationGrantType;
};

// Integration API (just requires bearer token)
integrationRouter
  .get("/verify", async (request: VerifiedRequest) => {
    return response({
      success: true,
      data: {
        valid: true,
        user: request.user,
        invitation: request.invitation.id,
      },
    });
  })
  .delete("/incident", async (request: VerifiedRequest, env: Env) => {
    const id = env.INCIDENTS.idFromString(request.instance.secret);
    const stub = env.INCIDENTS.get(id);

    const incidentId = request.query.id;
    if (typeof incidentId !== "string") {
      return response({
        success: false,
        reason: "bad_request",
        details: "Must specify incident id.",
      });
    }

    if (request.grantType !== "system") {
      return response({
        success: false,
        reason: "incorrect_code",
        details: "You are not authorized to perform this action.",
      });
    }

    await stub.deleteIncident(incidentId);

    return response({
      success: true,
      data: {},
    });
  })
  .get("/users", async (request: VerifiedRequest, env: Env) => {
    const id = env.INCIDENTS.idFromString(request.instance.secret);
    const stub = env.INCIDENTS.get(id);
    const invitations = await stub.getInvitationList();
    const active = await stub.getActiveUsers();

    return response({
      success: true,
      data: {
        invitations,
        active,
      },
    });
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
  })
  .get("/incidents.pdf", async (request: VerifiedRequest, env: Env) => {
    const client = getRobotEventsClient(env);

    const id = env.INCIDENTS.idFromString(request.instance.secret);
    const stub = env.INCIDENTS.get(id);

    const incidentResponse = await stub.handleJSON();

    const body = await (incidentResponse.json() as Promise<
      ShareResponse<Incident[]>
    >);

    if (!body.success) {
      return response({
        success: false,
        reason: "bad_request",
        details: "Could not get incidents from the sharing server.",
      });
    }

    const invitations = await stub.getInvitationList();

    const formatters = {
      date: new Intl.DateTimeFormat("en-US", {
        timeZone: `${request.cf?.timezone ?? "America/Chicago"}`,
        dateStyle: "full",
        timeStyle: "long",
      }),
    };

    const output = await generateIncidentReportPDF({
      sku: request.params.sku,
      client,
      incidents: body.data,
      users: invitations.map((invitation) => invitation.user),
      formatters,
    });

    return new Response(output, {
      headers: {
        "Content-Type": "application/pdf",
      },
    });
  });

export { integrationRouter };
