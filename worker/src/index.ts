import {
  IRequest,
  Router,
  createCors,
  error,
  json,
  withParams,
} from "itty-router";
import { response } from "./utils/request";

import {
  Env,
  Invitation,
  ShareInstance,
  AuthenticatedRequest,
  RequestHasInvitation,
  User,
} from "../types/server";
import {
  APIPostCreateResponseBody,
  APIGetInvitationResponseBody,
  APIPutInvitationAcceptResponseBody,
  APIPutInviteResponseBody,
  APIRegisterUserResponseBody,
  EventIncidentsInitData,
  APIDeleteInviteResponseBody,
} from "../types/api";
import {
  deleteInvitation,
  getInvitation,
  getUser,
  setInstance,
  setInvitation,
  setUser,
} from "./utils/data";
import { verifyInvitation, verifySignature, verifyUser } from "./utils/verify";

export const { preflight, corsify } = createCors({
  origins: ["*"],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
});

const router = Router<IRequest, [Env]>();

router

  // Pre-Request Middleware
  .all("*", preflight)
  .all("*", withParams)

  // All requests below this point require a signature
  .all("*", verifySignature)
  .post("/api/user", async (request: AuthenticatedRequest, env: Env) => {
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

  // All requests below this point require a registered user
  .all("*", verifyUser)
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

  // All requests below this point require a valid invitation for the SKU
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
  })
  .all("*", () =>
    response({
      success: false,
      reason: "bad_request",
      details: "unknown endpoint",
    })
  );

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return router.handle(request, env).then(json).catch(error).then(corsify);
  },
};

export { EventIncidents } from "./objects/instance";

// WITH REFCOUNTS AS (SELECT "First Name" as first, "Last Name" as last, "Email" as email, COUNT(*) as count FROM ref GROUP BY "Email" ORDER BY COUNT(*) DESC) SELECT count as num_events, COUNT(*) as count FROM REFCOUNTS GROUP BY num_events ORDER BY count ASC;
