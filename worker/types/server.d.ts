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
    from: string;
    admin: boolean;
    accepted: boolean;
};

export type User = {
    key: string;
    name: string;
};

export type SignedRequest = IRequest & {
    key: CryptoKey;
    keyHex: string;
    payload: string;
};
export type AuthenticatedRequest = SignedRequest & {
    user: User;
}

export type RequestHasInvitation = AuthenticatedRequest & {
    invitation: Invitation;
    instance: ShareInstance;
};

export interface Env {
    SHARES: KVNamespace;
    INVITATIONS: KVNamespace;
    USERS: KVNamespace;
    INCIDENTS: DurableObjectNamespace;
};