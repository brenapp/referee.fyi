import { mergeLWW, WithLWWConsistency } from "./lww.js";
import { mergeGrowSet } from "./gset.js";

// July 2024 - Samsung Internet does not support Set.prototype.intersection or Set.prototype.difference
import "core-js/actual/set";

type ConsistentMapElement = WithLWWConsistency<
  Record<string, unknown> & { id: string },
  never
>;

export type ConsistentMap<T extends ConsistentMapElement> = {
  deleted: string[];
  values: Record<string, T>;
};

export type ConsistentMapMergeOptions<T extends ConsistentMapElement> = {
  local: ConsistentMap<T>;
  remote: ConsistentMap<T>;
  ignore: readonly string[];
};

export type ConsistentMapPeerOutcome = {
  remove: string[];
  update: string[];
  create: string[];
};

export type ConsistentMapMergeResult<T extends ConsistentMapElement> = {
  resolved: ConsistentMap<T>;
  local: ConsistentMapPeerOutcome;
  remote: ConsistentMapPeerOutcome;
};

export function mergeMap<T extends ConsistentMapElement>({
  local,
  remote,
  ignore,
}: ConsistentMapMergeOptions<T>): ConsistentMapMergeResult<T> {
  const localIds = new Set(Object.keys(local.values));
  const remoteIds = new Set(Object.keys(remote.values));

  const localOnlyIds = localIds.difference(remoteIds);
  const remoteOnlyIds = remoteIds.difference(localIds);

  const sharedIds = [...localIds.intersection(remoteIds)];
  const mergeResults = sharedIds.map((id) =>
    mergeLWW({
      ignore: ignore,
      local: local.values[id],
      remote: remote.values[id],
    })
  );

  // Deleted Set
  const deleted = mergeGrowSet({
    local: local.deleted,
    remote: remote.deleted,
  });

  const localOutcome: ConsistentMapPeerOutcome = {
    create: [...remoteOnlyIds],
    remove: deleted.remoteOnly,
    update: mergeResults
      .filter((result) => result.changed.length > 0)
      .map((result) => result.resolved!.id),
  };

  const remoteOutcome: ConsistentMapPeerOutcome = {
    create: [...localOnlyIds],
    remove: deleted.localOnly,
    update: mergeResults
      .filter((result) => result.rejected.length > 0)
      .map((result) => result.resolved!.id),
  };

  const localOnlyValues = Object.fromEntries(
    [...localOnlyIds].map((id) => [id, local.values[id]])
  );
  const remoteOnlyValues = Object.fromEntries(
    [...remoteOnlyIds].map((id) => [id, remote.values[id]])
  );
  const sharedValues = Object.fromEntries(
    mergeResults.map((result) => [result.resolved!.id, result.resolved! as T])
  );

  const resolved: ConsistentMap<T> = {
    deleted: deleted.resolved,
    values: { ...localOnlyValues, ...remoteOnlyValues, ...sharedValues },
  };
  return {
    resolved,
    local: localOutcome,
    remote: remoteOutcome,
  };
}
