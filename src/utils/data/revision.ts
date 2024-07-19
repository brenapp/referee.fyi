import { WithRevision } from "~share/revision";

function getRevisionCount<T, U>(data: WithRevision<T, U>) {
  return data.revision?.count ?? 0;
}

function setIdToRecord<T>(
  set: Set<string>,
  values: Record<string, T>
): Record<string, T> {
  return Object.fromEntries([...set].map((id) => [id, values[id]]));
}

export type LocalRemoteComparison<T, U> = {
  localOnly: Record<string, WithRevision<T, U>>;
  remoteOnly: Record<string, WithRevision<T, U>>;
  localMoreRecent: Record<string, WithRevision<T, U>>;
  remoteMoreRecent: Record<string, WithRevision<T, U>>;
};

export function compareLocalAndRemote<T, U>(
  local: Record<string, WithRevision<T, U>>,
  remote: Record<string, WithRevision<T, U>>
): LocalRemoteComparison<T, U> {
  const localIds = new Set(Object.keys(local));
  const remoteIds = new Set(Object.keys(remote));

  console.log(local, remote);

  const remoteOnlyIds = remoteIds.difference(localIds);
  const localOnlyIds = localIds.difference(remoteIds);

  const bothIds = remoteIds.intersection(localIds);
  const remoteMoreRecentIds = [...bothIds].filter(
    (id) => getRevisionCount(local[id]) < getRevisionCount(remote[id])
  );
  const localMoreRecentIds = [...bothIds].filter(
    (id) => getRevisionCount(local[id]) > getRevisionCount(remote[id])
  );

  return {
    localOnly: setIdToRecord(localOnlyIds, local),
    remoteOnly: setIdToRecord(remoteOnlyIds, remote),
    remoteMoreRecent: setIdToRecord(new Set(remoteMoreRecentIds), remote),
    localMoreRecent: setIdToRecord(new Set(localMoreRecentIds), local),
  };
}
