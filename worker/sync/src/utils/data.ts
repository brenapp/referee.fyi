import {
  AssetMeta,
  AssetType,
  Invitation,
  InvitationListItem,
  ShareInstanceMeta,
  User,
} from "@referee-fyi/share";

export type UserRole = "none" | "system";

export type UserRow = {
  key: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

function log(label: string, response: D1Response) {
  if (!response.success) {
    console.error(`${label} failed`, response);
  }
  console.log(`${label} success`, response.meta);
}

export async function setUser(env: Env, user: User): Promise<void> {
  const response = await env.DB.prepare(
    `
    INSERT INTO users (key, name)
      VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET
      name = excluded.name,
      updated_at = CURRENT_TIMESTAMP
    `
  )
    .bind(user.key, user.name)
    .run();

  log("setUser", response);
}

export async function getUser(env: Env, key: string): Promise<UserRow | null> {
  const response = await env.DB.prepare("SELECT * FROM users WHERE key = ?")
    .bind(key)
    .run<UserRow>();
  log("getUser", response);

  if (!response.success) {
    return null;
  }

  return response.results?.[0] ?? null;
}

export async function isSystemKey(env: Env, key: string) {
  const user = await getUser(env, key);
  return user?.role === "system";
}

export type InvitationRole = "none" | "admin";

export type InvitationRow = {
  id: string;
  instance: string;
  invitee: string;
  inviter: string;
  role: InvitationRole;
  accepted: number;
  sku: string;
  created_at: string;
  updated_at: string;
};

export async function setInvitation(env: Env, invitation: Invitation) {
  const response = await env.DB.prepare(
    `
    INSERT INTO invitations (id, instance, invitee, inviter, role, accepted, sku, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      instance = excluded.instance,
      invitee = excluded.invitee,
      inviter = excluded.inviter,
      role = excluded.role,
      accepted = excluded.accepted,
      sku = excluded.sku,
      updated_at = CURRENT_TIMESTAMP
    `
  )
    .bind(
      invitation.id,
      invitation.instance_secret,
      invitation.user,
      invitation.from,
      invitation.admin ? "admin" : "none",
      invitation.accepted ? 1 : 0,
      invitation.sku
    )
    .run();

  log("setInvitation", response);
}

export async function getInvitation(
  env: Env,
  userKey: string,
  sku: string
): Promise<Invitation | null> {
  const response = await env.DB.prepare(
    `
    SELECT * FROM invitations
    WHERE invitee = ? AND sku = ?
    LIMIT 1
    `
  )
    .bind(userKey, sku)
    .run<InvitationRow>();
  log("getInvitation", response);

  if (!response.success) {
    return null;
  }

  const result = response.results?.[0];
  if (!result) {
    return null;
  }

  return {
    id: result.id,
    sku: result.sku,
    instance_secret: result.instance,
    user: result.invitee,
    from: result.inviter,
    admin: result.role === "admin",
    accepted: !!result.accepted,
  } satisfies Invitation;
}

export async function deleteInvitation(env: Env, userKey: string, sku: string) {
  const response = await env.DB.prepare(
    `
    DELETE FROM invitations
    WHERE invitee = ? AND sku = ?
    `
  )
    .bind(userKey, sku)
    .run();

  log("deleteInvitation", response);

  return response;
}

export async function deleteAllInvitationsForInstance(
  env: Env,
  secret: string,
  sku: string
) {
  const response = await env.DB.prepare(
    `
    DELETE FROM invitations
    WHERE instance = ? AND sku = ?
    `
  )
    .bind(secret, sku)
    .run();

  log("deleteAllInvitationsForInstance", response);

  return response;
}

export async function getInstance(
  env: Env,
  secret: string,
  sku: string
): Promise<ShareInstanceMeta | null> {
  const { results: invitations, ...response } = await env.DB.prepare(
    `
    SELECT * FROM invitations
    WHERE instance = ? AND sku = ?
    `
  )
    .bind(secret, sku)
    .all<InvitationRow>();
  log("getInstance", response);

  if (invitations.length === 0) {
    return null;
  }

  return {
    admins: invitations
      .filter((inv) => inv.role === "admin")
      .map((inv) => inv.invitee),
    invitations: invitations.map((inv) => inv.invitee),
    secret,
    sku,
  } satisfies ShareInstanceMeta;
}

export async function getAllInvitationsForInstance(
  env: Env,
  secret: string,
  sku: string
): Promise<InvitationListItem[]> {
  const { results: invitations, ...response } = await env.DB.prepare(
    `
    SELECT users.key, users.name, invitations.* FROM invitations
    JOIN users ON invitations.invitee = users.key
    WHERE instance = ? AND sku = ?
    `
  )
    .bind(secret, sku)
    .all<InvitationRow & User>();

  log("getInvitationsInInstance", response);

  return invitations.map((inv) => ({
    admin: inv.role === "admin",
    user: {
      key: inv.invitee,
      name: inv.name,
    } satisfies User,
  }));
}

export async function getInstancesForEvent(
  env: Env,
  sku: string
): Promise<string[]> {
  const { results: instances, ...response } = await env.DB.prepare(
    `
    SELECT DISTINCT instance FROM invitations
    WHERE sku = ?
    `
  )
    .bind(sku)
    .all<{ instance: string }>();

  log("getInstancesForEvent", response);

  return instances.map((i) => i.instance);
}

export type KeyExchangeRow = {
  id: number;
  code: string;
  sku: string;
  key: string;
  version: string;
  created_at: string;
};

export type RequestCode = {
  key: string;
  version: string;
};

export async function setRequestCode(
  env: Env,
  code: string,
  sku: string,
  request: RequestCode
) {
  const response = await env.DB.prepare(
    `
    INSERT INTO key_exchange (code, sku, key, version)
      VALUES (?, ?, ?, ?)
    ON CONFLICT(code, sku) DO UPDATE SET
      key = excluded.key,
      version = excluded.version
    `
  )
    .bind(code, sku, request.key, request.version)
    .run();
  log("setRequestCode", response);
}

export async function getRequestCodeUserKey(
  env: Env,
  code: string,
  sku: string
) {
  const response = await env.DB.prepare(
    `
    SELECT * FROM key_exchange
    WHERE code = ? AND sku = ? AND created_at >= datetime('now', '-60 seconds')
    LIMIT 1
    `
  )
    .bind(code, sku)
    .run<KeyExchangeRow>();
  log("getRequestCodeUserKey", response);

  if (!response.success) {
    return null;
  }

  const result = response.results?.[0];
  if (!result) {
    return null;
  }

  return result satisfies RequestCode;
}

export type AssetRow = {
  id: string;
  type: AssetType;
  owner: string;
  sku: string;
  images_id: string | null;
};

export async function getAssetMeta(env: Env, id: string) {
  const response = await env.DB.prepare("SELECT * FROM assets WHERE id = ?")
    .bind(id)
    .run<AssetRow>();
  log("getAssetMeta", response);

  if (!response.success) {
    return null;
  }

  const result = response.results?.[0];
  if (!result) {
    return null;
  }

  return result satisfies AssetMeta;
}

export async function setAssetMeta(env: Env, meta: AssetMeta) {
  const response = await env.DB.prepare(
    `
    INSERT INTO assets (id, type, owner, sku, images_id)
      VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      owner = excluded.owner,
      sku = excluded.sku,
      images_id = excluded.images_id
    `
  )
    .bind(meta.id, meta.type, meta.owner, meta.sku, meta.images_id)
    .run();
  log("setAssetMeta", response);
}
