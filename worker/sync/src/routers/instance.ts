import { AutoRouter } from "itty-router";
import { Env, RequestHasInvitation } from "../types";
import { verifyInvitation, verifySignature, verifyUser } from "../utils/verify";
import { response } from "../utils/request";
import {
  APIDeleteInviteResponseBody,
  APIPutInviteResponseBody,
  Invitation,
} from "@referee-fyi/share";
import {
  deleteInvitation,
  getInvitation,
  setInstance,
  setInvitation,
} from "../utils/data";

const instanceRouter = AutoRouter<RequestHasInvitation, [Env]>({
  before: [verifySignature, verifyUser, verifyInvitation],
});

instanceRouter
  .put("/api/:sku/invite", async (request: RequestHasInvitation, env: Env) => {
    const sku = request.params.sku;
    const user = request.query.user;
    const isAdmin = request.query.admin === "true";

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
      admin: isAdmin,
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

    if (newInvitation.admin && !instance.admins.includes(newInvitation.user)) {
      instance.admins.push(newInvitation.user);
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

export { instanceRouter };
