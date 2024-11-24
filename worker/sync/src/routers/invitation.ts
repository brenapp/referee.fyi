import { AutoRouter } from "itty-router";
import { verifySignature, verifyUser } from "../utils/verify";
import { AuthenticatedRequest, Env, EventIncidentsInitData } from "../types";
import { response } from "../utils/request";
import {
  APIGetInvitationResponseBody,
  APIGetListShareInstance,
  APIPostCreateResponseBody,
  APIPutInvitationAcceptResponseBody,
  Invitation,
  ShareInstanceMeta,
  User,
} from "@referee-fyi/share";
import {
  getInstancesForEvent,
  getInvitation,
  getUser,
  setInstance,
  setInvitation,
} from "../utils/data";
import { isSystemKey } from "../utils/systemKey";

const invitationRouter = AutoRouter({
  before: [verifySignature, verifyUser],
});

invitationRouter
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

    const instance: ShareInstanceMeta = {
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
    await stub.init(body);

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
  .get("/api/:sku/list", async (request: AuthenticatedRequest, env: Env) => {
    const isSystem = await isSystemKey(env, request.user.key);
    if (!isSystem) {
      return response<APIGetListShareInstance>({
        success: false,
        reason: "incorrect_code",
        details: "Invalid request.",
      });
    }

    const sku = request.params.sku;
    const ids = await getInstancesForEvent(env, sku);

    const secrets = ids.map((id) => id.split("#")[1]);

    return response<APIGetListShareInstance>({
      success: true,
      data: { instances: secrets },
    });
  })
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
  });

export { invitationRouter };
