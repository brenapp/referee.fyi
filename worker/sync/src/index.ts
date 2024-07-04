import { AutoRouter, IRequest } from "itty-router";
import { corsify, preflight, response } from "./utils";

import type { Invitation, ShareInstance, User } from "~types/server";
import {
  APIPostCreateResponseBody,
  APIGetInvitationResponseBody,
  APIPutInvitationAcceptResponseBody,
  APIPutInviteResponseBody,
  APIRegisterUserResponseBody,
  EventIncidentsInitData,
  APIDeleteInviteResponseBody,
  APIGetInvitationRequestResponseBody,
  APIPutInvitationRequestResponseBody,
} from "~types/api";
import {
  deleteInvitation,
  getInvitation,
  getRequestCodeUserKey,
  getUser,
  setInstance,
  setInvitation,
  setRequestCode,
  setUser,
} from "./data";
import {
  AuthenticatedRequest,
  Env,
  RequestHasInvitation,
  SignedRequest,
} from "./types";
import { integrationRouter } from "./integration";
import { verifySignature, verifyUser, verifyInvitation } from "./verify";

const verifySignature = async (request: IRequest & Request) => {
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

  const key = await importKey(publicKeyRaw);

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

  const valid = await verifyKeySignature(key, signature, message);

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

const verifyUser = async (request: SignedRequest, env: Env) => {
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

const verifyInvitation = async (request: AuthenticatedRequest, env: Env) => {
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

const router = AutoRouter<IRequest, [Env]>({
  before: [preflight],
  finally: [corsify],
});

router
  // Integration API
  .all("/api/integration/v1/*", integrationRouter.fetch)

  // Read Write API
  .all("*", verifySignature)
  .post("/api/user", async (request: SignedRequest, env: Env) => {
    const name = request.query.name;
    if (typeof name !== "string") {
      return response({
        success: false,
        reason: "bad_request",
        details: "Must specify name when registering ",
      });
    }

    const user: User = {
      key: request.keyHex,
      name,
    };

    await setUser(env, user);

    return response<APIRegisterUserResponseBody>({
      success: true,
      data: { user },
    });
  })
  .all("*", verifyUser)

  // Request Codes (Key Exchange)
  .put("/api/:sku/request", async (request: AuthenticatedRequest, env: Env) => {
    const sku = request.params.sku;

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

    await setRequestCode(env, code, sku, request.user.key, {
      expirationTtl: 600,
    });

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

    const key = await getRequestCodeUserKey(env, code, sku);
    if (!key) {
      return response({
        success: false,
        reason: "incorrect_code",
        details: "No such request code.",
      });
    }

    const user = await getUser(env, key);

    return response<APIGetInvitationRequestResponseBody>({
      success: true,
      data: { user: user ?? { key, name: "<Unknown User>" } },
    });
  })

  // Managing Instances
  .post("/api/:sku/create", async (request: AuthenticatedRequest, env: Env) => {
    const sku = request.params.sku;
    if (!sku) {
      return response({
        success: false,
        reason: "bad_request",
        details: "Must specify event sku",
      });
    }

    const instanceId = env.INCIDENTS.newUniqueId();
    const secret = instanceId.toString();

    const instance: ShareInstance = {
      secret,
      admins: [request.keyHex],
      invitations: [],
      sku,
    };

    const invitation: Invitation = {
      id: crypto.randomUUID(),
      admin: true,
      user: request.user.key,
      sku,
      instance_secret: secret,
      accepted: true,
      from: request.keyHex,
    };

    instance.invitations.push(invitation.user);
    await setInvitation(env, invitation);
    await setInstance(env, instance);

    const stub = env.INCIDENTS.get(instanceId);

    const body: EventIncidentsInitData = { sku, instance: secret };
    await stub.fetch(`https://share/init`, {
      body: JSON.stringify(body),
      method: "POST",
    });

    return response<APIPostCreateResponseBody>({
      success: true,
      data: {
        id: invitation.id,
        admin: invitation.admin,
        accepted: invitation.accepted,
        from: request.user,
        sku,
      },
    });
  })
  .get(
    "/api/:sku/invitation",
    async (request: AuthenticatedRequest, env: Env) => {
      const sku = request.params.sku;
      if (!sku) {
        return response({
          success: false,
          reason: "bad_request",
          details: "Must specify SKU to get invitation for.",
        });
      }

      const invitation: Invitation | null = await getInvitation(
        env,
        request.user.key,
        sku
      );

      if (!invitation) {
        return response({
          success: false,
          reason: "incorrect_code",
          details: "No invitation for that user and that event.",
        });
      }

      const from: User | null = await getUser(env, invitation.from);

      if (!from) {
        return response({
          success: false,
          reason: "server_error",
          details: "Could not get information about inviter.",
        });
      }

      return response<APIGetInvitationResponseBody>({
        success: true,
        data: {
          id: invitation.id,
          admin: invitation.admin,
          from,
          accepted: invitation.accepted,
          sku,
        },
      });
    }
  )
  .put("/api/:sku/accept", async (request: AuthenticatedRequest, env: Env) => {
    const sku = request.params.sku;
    const id = request.query.invitation;

    if (typeof id !== "string") {
      return response({
        success: false,
        reason: "bad_request",
        details: "Must specify invitation to accept.",
      });
    }

    const invitation = await getInvitation(env, request.user.key, sku);

    if (!invitation) {
      return response({
        success: false,
        reason: "incorrect_code",
        details: "No invitation exists for this user and event",
      });
    }

    if (invitation.id !== id) {
      return response({
        success: false,
        reason: "incorrect_code",
        details: "A newer invitation is available.",
      });
    }

    const from: User | null = await getUser(env, invitation.from);

    if (!from) {
      return response({
        success: false,
        reason: "server_error",
        details: "Could not get information about inviter.",
      });
    }

    invitation.accepted = true;

    await setInvitation(env, invitation);

    return response<APIPutInvitationAcceptResponseBody>({
      success: true,
      data: {
        id: invitation.id,
        accepted: invitation.accepted,
        admin: invitation.admin,
        from: from,
        sku,
      },
    });
  })
  .all("/api/:sku/*", verifyInvitation)
  .put("/api/:sku/invite", async (request: RequestHasInvitation, env: Env) => {
    const sku = request.params.sku;
    const user = request.query.user;

    if (typeof user !== "string") {
      return response({
        success: false,
        reason: "bad_request",
        details: "Must specify user to invite.",
      });
    }

    const invitation = request.invitation;

    if (!invitation.admin) {
      return response({
        success: false,
        reason: "incorrect_code",
        details: "This action requires admin permissions.",
      });
    }

    const newInvitation: Invitation = {
      id: crypto.randomUUID(),
      admin: false,
      user,
      sku,
      instance_secret: invitation.instance_secret,
      accepted: false,
      from: request.keyHex,
    };

    const currentInvitation: Invitation | null = await getInvitation(
      env,
      user,
      sku
    );
    if (currentInvitation && currentInvitation.accepted) {
      return response({
        success: false,
        reason: "bad_request",
        details: "User must leave current invitation for this event first.",
      });
    }

    const instance = request.instance;
    if (!instance.invitations.includes(newInvitation.user)) {
      instance.invitations.push(newInvitation.user);
    }

    await setInstance(env, instance);
    await setInvitation(env, newInvitation);

    return response<APIPutInviteResponseBody>({
      success: true,
      data: {},
    });
  })
  .delete(
    "/api/:sku/invite",
    async (request: RequestHasInvitation, env: Env) => {
      const sku = request.params.sku;
      const user = request.query.user;

      if (typeof user !== "string") {
        return response({
          success: false,
          reason: "bad_request",
          details: "Must specify user to uninvite.",
        });
      }

      const invitation = request.invitation;

      if (!invitation.admin && user !== request.user.key) {
        return response({
          success: false,
          reason: "incorrect_code",
          details: "This action requires admin permissions.",
        });
      }

      const userInvitation: Invitation | null = await getInvitation(
        env,
        user,
        sku
      );

      if (!userInvitation) {
        return response({
          success: true,
          data: {},
        });
      }

      const instance = request.instance;

      const index = instance.invitations.findIndex(
        (i) => i === userInvitation.user
      );
      instance.invitations.splice(index, 1);

      if (userInvitation.admin) {
        const index = instance.admins.findIndex(
          (i) => i === userInvitation.user
        );
        instance.admins.splice(index, 1);
      }

      // If the last admin leaves, remove everyone's invitations, functionally ending this session.
      if (userInvitation.admin && instance.admins.length < 1) {
        for (const user of instance.invitations) {
          await deleteInvitation(env, user, instance.sku);
        }
        instance.invitations = [];
      }

      await deleteInvitation(env, user, invitation.sku);
      await setInstance(env, instance);

      return response<APIDeleteInviteResponseBody>({
        success: true,
        data: {},
      });
    }
  )

  // Actions Inside Instances (Pass to Durable Object)
  .all("/api/:sku/:path+", async (request: RequestHasInvitation, env: Env) => {
    const id = env.INCIDENTS.idFromString(request.instance.secret);
    const stub = env.INCIDENTS.get(id);

    const search = new URL(request.url).search;

    const headers = new Headers(request.headers);

    // Pass extra informational headers to the Durable Object
    headers.set("X-Referee-Content", request.payload);
    headers.set("X-Referee-User-Name", request.user.name);
    headers.set("X-Referee-User-Key", request.user.key);

    return stub.fetch(`https://share/${request.params.path}${search}`, {
      method: request.method,
      headers,
    });
  });

export default { ...router };

export { EventIncidents } from "./incidents";
