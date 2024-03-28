import { IRequest, Router, createCors, error, json, withParams } from "itty-router";
import { response } from "./utils";

import { Env, Invitation, ShareInstance, AuthenticatedRequest, RequestHasInvitation, SignedRequest, User } from "../types/server";
import { APIPostCreateResponseBody, APIGetInvitationResponseBody, APIPutInvitationAcceptResponseBody, APIPutInviteResponseBody, APIRegisterUserResponseBody, EventIncidentsInitData, APIDeleteInviteResponseBody, UserInvitation, InvitationListItem, APIGetInvitationsResponseBody } from "../types/api";


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

    const signature = request.headers.get("X-Referee-Signature") ?? request.query.signature;
    const publicKeyRaw = request.headers.get("X-Referee-Public-Key") ?? request.query.publickey;
    const isoDate = request.headers.get("X-Referee-Date") ?? request.query.signature_date;

    if (typeof signature !== "string" || typeof publicKeyRaw !== "string" || typeof isoDate !== "string") {
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
        body
    ].join("\n");

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
    request.payload = body;
};

const verifyUser = async (request: SignedRequest, env: Env) => {

    const user: User | null = await env.USERS.get(request.keyHex, "json");

    if (!user) {
        return response({
            success: false,
            reason: "bad_request",
            details: "You must register to perform this action."
        });
    };

    request.user = user;
};

const verifyInvitation = async (request: AuthenticatedRequest, env: Env) => {

    const sku = request.params.sku;

    const key = `${request.keyHex}#${sku}`;
    const invitation: Invitation | null = await env.INVITATIONS.get(key, "json");

    if (!invitation) {
        return response({
            success: false,
            reason: "incorrect_code",
            details: "User does not have an active invitation for that event."
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
            details: "Cannot perform this action until this invitation is accepted."
        })
    }

    const instance: ShareInstance | null = await env.SHARES.get(`${sku}#${invitation.instance_secret}`, "json");

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
    .post("/api/user", async (request: AuthenticatedRequest, env: Env) => {

        const name = request.query.name;
        if (typeof name !== "string") {
            return response({
                success: false,
                reason: "bad_request",
                details: "Must specify name when registering "
            });
        }

        const user: User = {
            key: request.keyHex,
            name
        }

        await env.USERS.put(request.keyHex, JSON.stringify(user));

        return response<APIRegisterUserResponseBody>({
            success: true,
            data: { user }
        });

    })
    .all("*", verifyUser)
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
            instance_secret: secret,
            accepted: true,
            from: request.keyHex
        }

        instance.invitations.push(invitation.user);
        await env.INVITATIONS.put(`${request.keyHex}#${sku}`, JSON.stringify(invitation));
        await env.SHARES.put(`${sku}#${secret}`, JSON.stringify(instance));

        const id = env.INCIDENTS.idFromName(secret);
        const share = env.INCIDENTS.get(id);

        const body: EventIncidentsInitData = { sku };

        await share.fetch(`https://share/init`, {
            method: "POST",
            body: JSON.stringify(body)
        });

        return response<APIPostCreateResponseBody>({
            success: true,
            data: {
                id: invitation.id,
                admin: invitation.admin,
                accepted: invitation.accepted,
                from: request.user,
                sku
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

        const from: User | null = await env.USERS.get(invitation.from, "json");

        if (!from) {
            return response({
                success: false,
                reason: "server_error",
                details: "Could not get information about inviter."
            });
        }

        return response<APIGetInvitationResponseBody>({
            success: true,
            data: {
                id: invitation.id,
                admin: invitation.admin,
                from,
                accepted: invitation.accepted,
                sku
            }
        });
    })
    .put("/api/:sku/accept", async (request: AuthenticatedRequest, env: Env) => {

        const sku = request.params.sku;
        const id = request.query.invitation;

        if (typeof id !== "string") {
            return response({
                success: false,
                reason: "bad_request",
                details: "Must specify invitation to accept."
            })
        }

        const invitation: Invitation | null = await env.INVITATIONS.get(`${request.keyHex}#${sku}`, "json");

        if (!invitation) {
            return response({
                success: false,
                reason: "incorrect_code",
                details: "No invitation exists for this user and event"
            })
        }

        if (invitation.id !== id) {
            return response({
                success: false,
                reason: "incorrect_code",
                details: "A newer invitation is available."
            });
        }

        const from: User | null = await env.USERS.get(invitation.from, "json");

        if (!from) {
            return response({
                success: false,
                reason: "server_error",
                details: "Could not get information about inviter."
            });
        }

        invitation.accepted = true;

        await env.INVITATIONS.put(`${request.keyHex}#${sku}`, JSON.stringify(invitation));

        return response<APIPutInvitationAcceptResponseBody>({
            success: true,
            data: {
                id: invitation.id,
                accepted: invitation.accepted,
                admin: invitation.admin,
                from: from,
                sku
            }
        })

    })
    .all("/api/:sku/*", verifyInvitation)
    .get("/api/:sku/invitations", async (request: RequestHasInvitation, env: Env) => {
        const sku = request.params.sku;

        const instance = request.instance;
        const invitations: InvitationListItem[] = [];

        const users = instance.invitations.filter((u, i) => instance.invitations.indexOf(u) === i);
        for (const user of users) {
            const invitation = await env.INVITATIONS.get<Invitation>(`${user}#${sku}`, "json");
            const profile = await env.USERS.get<User>(user, "json");

            if (!invitation || !profile) { continue; }

            invitations.push({
                id: invitation.id, accepted: invitation.accepted, admin: invitation.admin, user: profile
            })
        };

        return response<APIGetInvitationsResponseBody>({
            success: true,
            data: {
                invitations
            }
        });
    })
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
            instance_secret: invitation.instance_secret,
            accepted: false,
            from: request.keyHex
        }

        const currentInvitation: Invitation | null = await env.INVITATIONS.get(`${newInvitation.user}#${newInvitation.sku}`, "json");
        if (currentInvitation && currentInvitation.accepted) {
            return response({
                success: false,
                reason: "bad_request",
                details: "User must leave current invitation for this event first."
            });
        };

        const instance = request.instance;
        if (!instance.invitations.includes(newInvitation.user)) {
            instance.invitations.push(newInvitation.user);
        }
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
                success: true,
                data: {}
            })
        };

        const instance = request.instance;

        const index = instance.invitations.findIndex(i => i === userInvitation.user);
        instance.invitations.splice(index, 1);

        if (userInvitation.admin) {
            const index = instance.admins.findIndex(i => i === userInvitation.user)
            instance.admins.splice(index, 1)
        };

        // If the last admin leaves, remove everyone's invitations, functionally ending this session.
        if (userInvitation.admin && instance.admins.length < 1) {
            for (const user of instance.invitations) {
                await env.INVITATIONS.delete(`${user}#${instance.sku}`);
            }
            instance.invitations = []
        };


        await env.INVITATIONS.delete(`${user}#${invitation.sku}`);
        await env.SHARES.put(`${invitation.sku}#${invitation.instance_secret}`, JSON.stringify(instance));

        return response<APIDeleteInviteResponseBody>({
            success: true,
            data: {}
        })
    })
    .all("/api/:sku/:path+", async (request: RequestHasInvitation, env: Env) => {
        const id = env.INCIDENTS.idFromName(`${request.instance.sku}#${request.instance.secret}`);
        const stub = env.INCIDENTS.get(id)

        const search = new URL(request.url).search;

        const headers = new Headers(request.headers);

        // Pass extra informational headers to the Durable Object
        headers.set("X-Referee-Content", request.payload);
        headers.set("X-Referee-User-Name", request.user.name);
        headers.set("X-Referee-User-Key", request.user.name);

        return stub.fetch(`https://share/${request.params.path}${search}`, {
            method: request.method,
            headers,
        });
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