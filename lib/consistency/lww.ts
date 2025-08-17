import { z } from "zod/v4";

export type History<T extends Record<string, unknown>, K extends keyof T> = {
  prev: T[K];
  peer: string;
  instant: string;
};

export const HistorySchema = z
  .object({
    prev: z.any(),
    peer: z.string(),
    instant: z.string(),
  })
  .meta({
    id: "History",
    description: "History entry of a value.",
  });

export type KeyRegister<
  T extends Record<string, unknown>,
  K extends keyof T,
> = {
  count: number;
  peer: string;
  instant: string; // ISO Date
  history: History<T, K>[];
};

export const KeyRegisterSchema = z
  .object({
    count: z.number(),
    peer: z.string(),
    instant: z.string(), // ISO Date
    history: z.array(HistorySchema),
  })
  .meta({
    id: "KeyRegister",
    description:
      "Tracks the change in a value over time using last-write wins consistency.",
  });

export type LastWriteWinsConsistency<
  T extends Record<string, unknown>,
  U extends keyof T,
> = {
  [K in Exclude<keyof T, U>]: KeyRegister<T, K>;
};

export const LastWriteWinsConsistencySchema = <
  T extends z.ZodRecord["keyType"],
>(
  key: T
) => z.record(key, KeyRegisterSchema);

export type WithLWWConsistency<
  T extends Record<string, unknown>,
  U extends keyof T,
> = T & {
  consistency: LastWriteWinsConsistency<T, U>;
};

export type BaseWithLWWConsistency = WithLWWConsistency<
  Record<string, unknown>,
  never
>;

export type LWWKeys<T extends BaseWithLWWConsistency> = Exclude<
  keyof T["consistency"],
  symbol | number
>;

export type MergeOptions<T extends BaseWithLWWConsistency> = {
  local: T | null | undefined;
  remote: T | null | undefined;
  ignore: readonly string[];
};

export type MergeResult<T extends BaseWithLWWConsistency> = {
  resolved: T | null | undefined;
  changed: LWWKeys<T>[];
  rejected: LWWKeys<T>[];
};

export type MergeFunction<T extends BaseWithLWWConsistency> = (
  options: MergeOptions<T>
) => MergeResult<T>;

/**
 * Enforces last-write wins consistency on the given consistent object
 *
 * @param local The local version of the object
 * @param remote The remote version of the object
 *
 * @returns The merged value, and a list of values that changed from local
 */
export function mergeLWW<T extends BaseWithLWWConsistency>(
  options: MergeOptions<T>
): MergeResult<T> {
  if (!options.local && options.remote) {
    const changed = Object.keys(options.remote).filter(
      (key) => key !== "consistency" && !options.ignore.includes(key)
    ) as LWWKeys<T>[];
    return { resolved: options.remote, changed, rejected: [] };
  }

  if (!options.remote && options.local) {
    const rejected = Object.keys(options.local).filter(
      (key) => key !== "consistency" && !options.ignore.includes(key)
    ) as LWWKeys<T>[];
    return { resolved: options.local, changed: [], rejected };
  }

  if (!options.remote && !options.local) {
    return { resolved: options.local, changed: [], rejected: [] };
  }

  const local = options.local!;
  const remote = options.remote!;

  const resolved = { ...local, consistency: { ...local.consistency } };
  const changed: LWWKeys<T>[] = [];
  const rejected: LWWKeys<T>[] = [];

  for (const key of Object.keys(remote) as LWWKeys<T>[]) {
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
        instant: remote.consistency[key].instant,
      };
      changed.push(key);
    }
  }

  return { resolved, changed, rejected };
}

export type InitOptions<T extends BaseWithLWWConsistency> = {
  value: Omit<T, "consistency">;
  peer: string;
  ignore: readonly string[];
};

export function initLWW<T extends BaseWithLWWConsistency>({
  value,
  peer,
  ignore,
}: InitOptions<T>): T {
  const keys = Object.keys(value).filter(
    (key) => !ignore.includes(key)
  ) as LWWKeys<T>[];

  const consistency: Record<
    string,
    KeyRegister<T, keyof T>
  > = Object.fromEntries(
    keys.map((key) => [
      key,
      { count: 0, instant: new Date().toISOString(), peer, history: [] },
    ])
  );

  return { ...value, consistency } as unknown as T;
}

export type EquivalentCheckOptions<T extends BaseWithLWWConsistency> = {
  left: T | null | undefined;
  right: T | null | undefined;
  ignore: readonly string[];
};

export function equivalentLWW<T extends BaseWithLWWConsistency>({
  left,
  right,
  ignore,
}: EquivalentCheckOptions<T>): boolean {
  if (!left || !right) {
    return !left && !right;
  }

  for (const key of Object.keys(left) as LWWKeys<T>[]) {
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

export type UpdateOptions<K, V> = {
  peer: string;
  key: K;
  value: V;
  instant?: string;
};

export function updateLWW<
  T extends BaseWithLWWConsistency,
  const K extends LWWKeys<T>,
  V = T[K],
>(
  object: T,
  { key, value, peer, instant = new Date().toISOString() }: UpdateOptions<K, V>
): T {
  const current = object.consistency[key].history as History<T, K>[];
  const register: KeyRegister<T, K> = {
    count: object.consistency[key].count + 1,
    peer,
    instant,
    history: current.concat({
      prev: object[key],
      peer,
      instant: object.consistency[key].instant,
    } as History<T, K>),
  };
  return {
    ...object,
    [key]: value,
    consistency: { ...object.consistency, [key]: register },
  };
}

export function isKeyLWW<T extends BaseWithLWWConsistency>(
  key: string | number | symbol,
  ignore: readonly string[]
): key is LWWKeys<T> {
  return !ignore.includes(key as string) && key !== "consistency";
}
