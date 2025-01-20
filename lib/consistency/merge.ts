export type PeerOutcome<K> = {
  added: K[];
  changed: K[];
  removed: K[];
};

export type MergeResult<T, K = T> = {
  resolved: T;
  local: PeerOutcome<K>;
  remote: PeerOutcome<K>;
};
