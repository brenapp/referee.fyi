import {
  AssetMeta,
  Invitation,
  ShareInstanceMeta,
  User,
} from "@referee-fyi/share";

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

export async function setInstance(env: Env, instance: ShareInstanceMeta) {
  return env.SHARES.put(
    `${instance.sku}#${instance.secret}`,
    JSON.stringify(instance)
  );
}

export async function getInstance(env: Env, secret: string, sku: string) {
  return env.SHARES.get<ShareInstanceMeta>(`${sku}#${secret}`, "json");
}

export async function getInstancesForEvent(
  env: Env,
  sku: string
): Promise<string[]> {
  const result = await env.SHARES.list({ prefix: sku + "#" });
  return result.keys.map((result) => result.name);
}

export type RequestCode = {
  key: string;
  version: string;
};

export async function setRequestCode(
  env: Env,
  code: string,
  sku: string,
  request: RequestCode,
  options?: KVNamespacePutOptions
) {
  return env.REQUEST_CODES.put(
    `${sku}#${code}`,
    JSON.stringify(request),
    options
  );
}

export async function getRequestCodeUserKey(
  env: Env,
  code: string,
  sku: string
) {
  return env.REQUEST_CODES.get<RequestCode>(`${sku}#${code}`, "json");
}

export async function getAssetMeta(env: Env, id: string) {
  return env.ASSETS.get<AssetMeta>(id, "json");
}

export async function setAssetMeta(env: Env, meta: AssetMeta) {
  return env.ASSETS.put(meta.id, JSON.stringify(meta));
}
