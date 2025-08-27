export type SystemKeyMetadata = {
  name: string;
};

export async function getSystemKeyMetadata(
  env: Env,
  key: string
): Promise<SystemKeyMetadata | null> {
  const user = await env.DB.prepare(
    `
    SELECT name, is_system FROM users WHERE key = ? AND is_system = true
    `
  )
    .bind(key)
    .first<{ name: string; is_system: boolean }>();

  if (!user) {
    return null;
  }
  return { name: user.name };
}

export async function isSystemKey(env: Env, key: string) {
  const metadata = await getSystemKeyMetadata(env, key);
  return metadata !== null;
}
