import type { KeyArray, KeysWithout } from "~types";

export type History<T extends Record<string, unknown>, K extends keyof T> = {
  prev: T[K];
  peer: string;
};

export type KeyRegister<
  T extends Record<string, unknown>,
  K extends keyof T,
> = {
  count: number;
  peer: string;
  history: History<T, K>[];
};

export type LastWriteWinsConsistency<
  T extends Record<string, unknown>,
  U extends KeyArray<T>,
> = {
  [K in keyof Omit<T, U[number]>]: KeyRegister<T, K>;
};

export type WithLWWConsistency<
  T extends Record<string, unknown>,
  U extends KeyArray<T>,
> = T & {
  consistency: LastWriteWinsConsistency<T, U>;
};

export type MergeOptions<
  T extends Record<string, unknown>,
  U extends KeyArray<T>,
> = {
  local: WithLWWConsistency<T, U>;
  remote: WithLWWConsistency<T, U>;
  ignore: KeyArray<T>;
};

export type MergeResult<
  T extends Record<string, unknown>,
  U extends KeyArray<T>,
> = {
  resolved: WithLWWConsistency<T, U>;
  changed: KeysWithout<T, U>[];
};

/**
 * Enforces last-write wins consistency on the given consistent object
 *
 * @param local The local version of the object
 * @param remote The remote version of the object
 *
 * @returns The merged value, and a list of values that changed from local
 */
export function merge<
  T extends Record<string, unknown>,
  const U extends KeyArray<T>,
>({ local, remote, ignore }: MergeOptions<T, U>): MergeResult<T, U> {
  const resolved = { ...local };
  const changed: KeysWithout<T, U>[] = [];

  for (const key of Object.keys(remote) as KeysWithout<T, U>[]) {
    if (ignore.includes(key) || key === "consistency") {
      continue;
    }

    const localHistory = local.consistency[key];
    const remoteHistory = remote.consistency[key];

    const shouldOverride =
      // Remote Count > Local Count
      remoteHistory.count > localHistory.count ||
      // Tie Breaker
      (remoteHistory.count === localHistory.count &&
        remoteHistory.peer > localHistory.peer);

    if (shouldOverride) {
      resolved[key] = remote[key];
      resolved.consistency[key] = remote.consistency[key];
      changed.push(key);
    }
  }

  return { resolved, changed };
}

export type InitOptions<T, U extends KeyArray<T>> = {
  value: T;
  peer: string;
  ignore: U;
};

export function init<
  T extends Record<string, unknown>,
  const U extends KeyArray<T>,
>({ value, peer, ignore }: InitOptions<T, U>): WithLWWConsistency<T, U> {
  const keys = Object.keys(value).filter(
    (key) => !ignore.includes(key)
  ) as KeysWithout<T, U>[];

  const consistency = Object.fromEntries<KeyRegister<T, U[number]>>(
    keys.map((key) => [key, { count: 0, peer, history: [] }])
  ) as LastWriteWinsConsistency<T, U>;

  return { ...value, consistency };
}
