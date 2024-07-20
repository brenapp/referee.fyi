import type { KeyArray, KeysWithout } from "~types";

export type History<
  T extends Record<string, unknown>,
  K extends keyof T,
  M extends Record<string, unknown> = Record<never, unknown>,
> = M & {
  prev: T[K];
  peer: string;
};

export type KeyRegister<
  T extends Record<string, unknown>,
  K extends keyof T,
  M extends Record<string, unknown> = Record<never, unknown>,
> = {
  count: number;
  peer: string;
  history: History<T, K, M>[];
};

export type LastWriteWinsConsistency<
  T extends Record<string, unknown>,
  U extends KeyArray<T>,
  M extends Record<string, unknown> = Record<never, unknown>,
> = {
  [K in keyof Omit<T, U[number]>]: KeyRegister<T, K, M>;
};

export type WithLWWConsistency<
  T extends Record<string, unknown>,
  U extends KeyArray<T>,
  M extends Record<string, unknown> = Record<never, unknown>,
> = T & {
  consistency: LastWriteWinsConsistency<T, U, M>;
};

export type MergeOptions<
  T extends Record<string, unknown>,
  U extends KeyArray<T>,
> = {
  local: WithLWWConsistency<T, U> | null | undefined;
  remote: WithLWWConsistency<T, U> | null | undefined;
  ignore: KeyArray<T>;
};

export type MergeResult<
  T extends Record<string, unknown>,
  U extends KeyArray<T>,
> = {
  resolved: WithLWWConsistency<T, U> | null | undefined;
  changed: KeysWithout<T, U>[];
  rejected: KeysWithout<T, U>[];
};

/**
 * Enforces last-write wins consistency on the given consistent object
 *
 * @param local The local version of the object
 * @param remote The remote version of the object
 *
 * @returns The merged value, and a list of values that changed from local
 */
export function mergeLWW<
  T extends Record<string, unknown>,
  const U extends KeyArray<T>,
>(options: MergeOptions<T, U>): MergeResult<T, U> {
  if (!options.local && options.remote) {
    const changed = Object.keys(options.remote).filter(
      (key) => key !== "consistency" && !options.ignore.includes(key)
    ) as KeysWithout<T, U>[];
    return { resolved: options.remote, changed, rejected: [] };
  }

  if (!options.remote && options.local) {
    const rejected = Object.keys(options.local).filter(
      (key) => key !== "consistency" && !options.ignore.includes(key)
    ) as KeysWithout<T, U>[];
    return { resolved: options.local, changed: [], rejected };
  }

  if (!options.remote && !options.local) {
    return { resolved: options.local, changed: [], rejected: [] };
  }

  const local = options.local!;
  const remote = options.remote!;

  const resolved = { ...local, consistency: { ...local.consistency } };
  const changed: KeysWithout<T, U>[] = [];
  const rejected: KeysWithout<T, U>[] = [];

  for (const key of Object.keys(remote) as KeysWithout<T, U>[]) {
    if (options.ignore.includes(key) || key === "consistency") {
      continue;
    }

    const localHistory = local.consistency[key];
    const remoteHistory = remote.consistency[key];

    // Local History is more advanced
    const shouldReject = localHistory.count > remoteHistory.count;

    if (shouldReject) {
      rejected.push(key);
    }

    const shouldOverride =
      // Remote Count > Local Count
      remoteHistory.count > localHistory.count ||
      // Tie Breaker
      (remoteHistory.count === localHistory.count &&
        remoteHistory.peer > localHistory.peer);

    if (shouldOverride) {
      resolved[key] = remote[key];
      resolved.consistency[key] = {
        count: remote.consistency[key].count,
        peer: remote.consistency[key].peer,
        history: remote.consistency[key].history,
      };
      changed.push(key);
    }
  }

  return { resolved, changed, rejected };
}

export type InitOptions<T, U extends KeyArray<T>> = {
  value: T;
  peer: string;
  ignore: U;
};

export function initLWW<
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

export type EquivalentCheckOptions<
  T extends Record<string, unknown>,
  U extends KeyArray<T>,
> = {
  left: WithLWWConsistency<T, U> | null | undefined;
  right: WithLWWConsistency<T, U> | null | undefined;
  ignore: KeyArray<T>;
};

export function equivalentLWW<
  T extends Record<string, unknown>,
  const U extends KeyArray<T>,
>({ left, right, ignore }: EquivalentCheckOptions<T, U>): boolean {
  if (!left || !right) {
    return !left && !right;
  }

  for (const key of Object.keys(left) as KeysWithout<T, U>[]) {
    if (ignore.includes(key) || key === "consistency") {
      continue;
    }

    const leftConsistency = left.consistency[key];
    const rightConsistency = right.consistency[key];

    if (
      leftConsistency.count !== rightConsistency.count ||
      leftConsistency.peer !== rightConsistency.peer
    ) {
      return false;
    }
  }

  return true;
}

export type UpdateOptions<
  T extends Record<string, unknown>,
  U extends KeyArray<T>,
  K extends KeysWithout<T, U>,
  M extends Record<string, unknown>,
> = M & {
  key: K;
  value: T[K];
  peer: string;
};

export function updateLWW<
  T extends Record<string, unknown>,
  const U extends KeyArray<T>,
  K extends KeysWithout<T, U>,
  M extends Record<string, unknown>,
>(
  object: WithLWWConsistency<T, U>,
  { key, value, peer, ...meta }: UpdateOptions<T, U, K, M>
): WithLWWConsistency<T, U> {
  const register: KeyRegister<T, K> = {
    count: object.consistency[key].count + 1,
    peer,
    history: [
      ...object.consistency[key].history,
      { peer: object.consistency[key].peer, prev: object[key], ...meta },
    ],
  };
  return {
    ...object,
    [key]: value,
    consistency: { ...object.consistency, [key]: register },
  };
}
