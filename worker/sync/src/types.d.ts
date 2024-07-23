import { IRequest } from "itty-router";
import { ShareInstance, Invitation, User } from "@referee-fyi/share";
import { EventIncidents } from "./incidents";

export type SignedRequest = IRequest & {
  key: CryptoKey;
  keyHex: string;
  payload: string;
};
export type AuthenticatedRequest = SignedRequest & {
  user: User;
};

export type RequestHasInvitation = AuthenticatedRequest & {
  invitation: Invitation;
  instance: ShareInstance;
};

export type EventIncidentsInitData = {
  instance: string;
  sku: string;
};

export interface Env {
  SHARES: KVNamespace;
  INVITATIONS: KVNamespace;
  USERS: KVNamespace;
  REQUEST_CODES: KVNamespace;
  INCIDENTS: DurableObjectNamespace<EventIncidents>;
}
