import { IRequest, Router, createCors, error, json, withParams } from "itty-router";
import { response } from "./utils";

import { Env, Invitation, ShareInstance, AuthenticatedRequest, RequestHasInvitation } from "../types/server";
import { APICreateResponseBody, APIGetInvitationResponseBody, APIPutInviteResponseBody } from "../types/api";


export const { preflight, corsify } = createCors({
    origins: ["*"],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
});

const KEY_PREFIX = "ECDSA:";
const KEY_ALGORITHM = { name: "ECDSA", namedCurve: "P-384" }

function ingestHex(hex: string): Uint8Array | null {
    const keyBuffer = new Uint8Array(hex.length / 2);

    for (let i = 0; i < hex.length; i += 2) {
        const value = Number.parseInt(hex[i] + hex[i + 1], 16);

        if (!Number.isFinite(value)) {
            return null;
        }

        keyBuffer[i / 2] = value;
    };

    return keyBuffer;
};

const verifySignature = async (request: IRequest & Request) => {
    const now = new Date();

    const signature = request.headers.get("X-Referee-Signature");
    const publicKeyRaw = request.headers.get("X-Referee-Public-Key");
    const isoDate = request.headers.get("X-Referee-Date");

    if (!signature || !publicKeyRaw || !isoDate) {
        return response({
            success: false,
            reason: "incorrect_code",
            details: "Request must contain signature, public key, and date headers."
        });
    };

    const dateToVerify = new Date(isoDate);

    const skew = Math.abs(now.getTime() - dateToVerify.getTime());
    if (skew > 60 * 1000) {
        return response({
            success: false,
            reason: "bad_request",
            details: `Skew between reported date (${dateToVerify.toISOString()}) and actual date (${now.toISOString()}) too large.`
        })
    };

    if (!publicKeyRaw.startsWith(KEY_PREFIX)) {
        return response({
            success: false,
            reason: "bad_request",
            details: "Incorrect public key form."
        })
    };

    const keyBuffer = ingestHex(publicKeyRaw.slice(KEY_PREFIX.length));

    if (!keyBuffer) {
        return response({
            success: false,
            reason: "bad_request",
            details: "Invalid public key."
        });
    }

    let key: CryptoKey | null = null;
    try {
        key = await crypto.subtle.importKey("raw", keyBuffer, KEY_ALGORITHM, true, ["verify"]);
    } catch (e) {
        return response({
            success: false,
            reason: "bad_request",
            details: "Invalid public key."
        });
    }

    if (!key) {
        return response({
            success: false,
            reason: "bad_request",
            details: "Invalid public key."
        });
    };

    const message = [
        dateToVerify.toISOString(),
        request.url,
        await request.text()
    ].join("");

    const encoder = new TextEncoder();

    const messageBuffer = encoder.encode(message);
    const signatureBuffer = ingestHex(signature);

    if (!signatureBuffer) {
        return response({
            success: false,
            reason: "incorrect_code",
            details: "Invalid signature."
        })
    }

    const valid = await crypto.subtle.verify({ ...KEY_ALGORITHM, hash: "SHA-256" }, key, signatureBuffer, messageBuffer)

    if (!valid) {
        return response({
            success: false,
            reason: "incorrect_code",
            details: "Invalid signature."
        })
    };

    request.key = key;
    request.keyHex = publicKeyRaw.slice(KEY_PREFIX.length);
};

const verifyInvitation = async (request: AuthenticatedRequest, env: Env) => {

    const sku = request.params.sku;
    const invitationId = request.query.invitation;

    if (typeof invitationId !== "string") {
        return response({
            success: false,
            reason: "bad_request",
            details: "Must specify invitation and user."
        });
    };

    const key = `${request}`;
    const invitation: Invitation | null = await env.INVITATIONS.get(key, "json");

    if (!invitation) {
        return response({
            success: false,
            reason: "incorrect_code",
            details: "Invalid invitation code."
        });
    }

    if (invitation.user != request.keyHex) {
        return response({
            success: false,
            reason: "incorrect_code",
            details: "Invitation is not valid for this user."
        })
    };

    if (invitation.sku !== sku) {
        return response({
            success: false,
            reason: "incorrect_code",
            details: "Invitation is not valid for this event"
        })
    }

    const instance: ShareInstance | null = await env.SHARES.get(key, "json");

    if (!instance) {
        return response({
            success: false,
            reason: "server_error",
            details: "Could not get share instance."
        })
    }

    request.invitation = invitation;
    request.instance = instance;
};

const router = Router<IRequest, [Env]>();

router
    .all("*", preflight)
    .all("*", withParams)
    .all("*", verifySignature)
    .get("/", () => response({ success: true, data: "ok" }))
    .post("/api/:sku/create", async (request: AuthenticatedRequest, env: Env) => {

        const sku = request.params.sku;
        if (!sku) {
            return response({
                success: false,
                reason: "bad_request",
                details: "Must specify event sku"
            });
        }

        const secret = crypto.randomUUID();

        const instance: ShareInstance = {
            secret,
            admins: [request.keyHex],
            invitations: [],
            sku
        }

        const invitation: Invitation = {
            id: crypto.randomUUID(),
            admin: true,
            user: request.keyHex,
            sku,
            instance_secret: secret
        }

        instance.invitations.push(invitation.id);
        await env.INVITATIONS.put(`${request.keyHex}#${sku}`, JSON.stringify(invitation));
        await env.SHARES.put(`${sku}#${secret}`, JSON.stringify(instance));

        return response<APICreateResponseBody>({
            success: true,
            data: {
                invitation: invitation.id,
                admin: true,
            }
        })

    })
    .get("/api/:sku/invitation", async (request: AuthenticatedRequest, env: Env) => {
        const sku = request.params.sku;
        if (!sku) {
            return response({
                success: false,
                reason: "bad_request",
                details: "Must specify SKU to get invitation for."
            })
        };

        const key = `${request.keyHex}#${request.params.sku}`
        const invitation: Invitation | null = await env.INVITATIONS.get(key, "json");

        if (!invitation) {
            return response({
                success: false,
                reason: "incorrect_code",
                details: "No invitation for that user and that event."
            });
        };

        return response<APIGetInvitationResponseBody>({
            success: true,
            data: {
                invitation: invitation.id,
                admin: invitation.admin
            }
        });
    })





    .all("/api/:sku+", verifyInvitation)
    .put("/api/:sku/invite", async (request: RequestHasInvitation, env: Env) => {

        const sku = request.params.sku;
        const user = request.query.user;

        if (typeof user !== "string") {
            return response({
                success: false,
                reason: "bad_request",
                details: "Must specify user to invite."
            })
        };

        const invitation = request.invitation;

        if (!invitation.admin) {
            return response({
                success: false,
                reason: "incorrect_code",
                details: "This action requires admin permissions."
            });
        };

        const newInvitation: Invitation = {
            id: crypto.randomUUID(),
            admin: false,
            user,
            sku,
            instance_secret: invitation.instance_secret
        }

        const instance = request.instance;
        instance.invitations.push(newInvitation.id);
        await env.SHARES.put(`${sku}#${invitation.instance_secret}`, JSON.stringify(instance));
        await env.INVITATIONS.put(`${newInvitation.user}#${newInvitation.sku}`, JSON.stringify(newInvitation));

        return response<APIPutInviteResponseBody>({
            success: true,
            data: {}
        });
    })
    .delete("/api/:sku/invite", async (request: RequestHasInvitation, env: Env) => {
        const user = request.query.user;

        if (typeof user !== "string") {
            return response({
                success: false,
                reason: "bad_request",
                details: "Must specify user to uninvite."
            })
        };

        const invitation = request.invitation;

        if (!invitation.admin && user !== request.keyHex) {
            return response({
                success: false,
                reason: "incorrect_code",
                details: "This action requires admin permissions."
            });
        };

        const userInvitation: Invitation | null = await env.INVITATIONS.get(`${user}#${invitation.sku}`, "json");

        if (!userInvitation) {
            return response({
                success: false,
                reason: "bad_request",
                details: "Could not find user invitation."
            })
        };

        const instance = request.instance;

        const index = instance.invitations.findIndex(i => i === userInvitation.id);
        instance.invitations.splice(index, 1);

        await env.INVITATIONS.delete(`${user}#${invitation.sku}`);
        await env.SHARES.put(`${invitation.sku}#${invitation.instance_secret}`, JSON.stringify(instance));
    })

    .all("*", () => response({
        success: false,
        reason: "bad_request",
        details: "unknown endpoint",
    }))

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        return router.handle(request, env).then(json).catch(error).then(corsify);
    }
}

export { EventIncidents } from "./incidents";