import { Env, Invitation, ShareInstance, User } from "../types/server";

export async function setUser(env: Env, user: User): Promise<void> {
  return env.USERS.put(user.key, JSON.stringify(user));
}

export async function getUser(env: Env, key: string): Promise<User | null> {
  return env.USERS.get<User>(key, "json");
}

export async function setInvitation(env: Env, invitation: Invitation) {
  return env.INVITATIONS.put(
    `${invitation.user}#${invitation.sku}`,
    JSON.stringify(invitation)
  );
}

export async function getInvitation(env: Env, userKey: string, sku: string) {
  return env.INVITATIONS.get<Invitation>(`${userKey}#${sku}`, "json");
}

export async function deleteInvitation(env: Env, userKey: string, sku: string) {
  return env.INVITATIONS.delete(`${userKey}#${sku}`);
}

export async function setInstance(env: Env, instance: ShareInstance) {
  return env.SHARES.put(
    `${instance.sku}#${instance.secret}`,
    JSON.stringify(instance)
  );
}

export async function getInstance(env: Env, secret: string, sku: string) {
  return env.SHARES.get<ShareInstance>(`${sku}#${secret}`, "json");
}
