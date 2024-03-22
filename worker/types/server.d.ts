import type { IRequest } from "itty-router";

export type ShareInstance = {
    sku: string;
    admins: string[];
    invitations: string[];
    secret: string;
}

export type Invitation = {
    id: string;
    sku: string;
    instance_secret: string;
    user: string;
    admin: boolean;
};

type AuthenticatedRequest = IRequest & {
    key: CryptoKey;
    keyHex: string;
};

export type RequestHasInvitation = AuthenticatedRequest & {
    invitation: Invitation;
    instance: ShareInstance;
};

export interface Env {
    SHARES: KVNamespace;
    INVITATIONS: KVNamespace;
    INCIDENTS: DurableObjectNamespace;
};