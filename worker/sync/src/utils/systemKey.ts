import { Env } from "../types";

export type SystemKeyMetadata = {
  name: string;
};

export async function getSystemKeyMetadata(
  env: Env,
  key: string
): Promise<SystemKeyMetadata | null> {
  const metadata = await env.SYSTEM_KEYS.get<SystemKeyMetadata>(key, {
    type: "json",
  });

  if (!metadata) {
    return null;
  }

  return metadata;
}

export async function isSystemKey(env: Env, key: string) {
  const metadata = await getSystemKeyMetadata(env, key);
  return metadata !== null;
}
