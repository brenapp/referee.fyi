import { WithLWWConsistency } from "./lww.js";
import { mergeGrowSet } from "./gset.js";

// July 2024 - Samsung Internet does not support Set.prototype.intersection or Set.prototype.difference
import "core-js/actual/set";
import { MergeResult, PeerOutcome } from "./merge.js";

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
  merge: (local: T, remote: T) => MergeResult<T | null | undefined, string>;
};

export function mergeMap<T extends ConsistentMapElement>({
  local,
  remote,
  merge,
}: ConsistentMapMergeOptions<T>): MergeResult<ConsistentMap<T>, string> {
  const localIds = new Set(Object.keys(local.values));
  const remoteIds = new Set(Object.keys(remote.values));

  const localOnlyIds = localIds.difference(remoteIds);
  const remoteOnlyIds = remoteIds.difference(localIds);

  const sharedIds = [...localIds.intersection(remoteIds)];
  const mergeResults = sharedIds.map((id) =>
    merge(local.values[id], remote.values[id])
  );

  // Deleted Set
  const deleted = mergeGrowSet({
    local: local.deleted,
    remote: remote.deleted,
  });

  const localOutcome: PeerOutcome<string> = {
    added: [...remoteOnlyIds],
    removed: deleted.local.added,
    changed: mergeResults
      .filter((result) => result.local.changed.length > 0)
      .map((result) => result.resolved!.id),
  };

  const remoteOutcome: PeerOutcome<string> = {
    added: [...localOnlyIds],
    removed: deleted.remote.added,
    changed: mergeResults
      .filter((result) => result.remote.changed.length > 0)
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
