import type { Incident } from "./incident.ts";
import type { BaseMatchScratchpad, MatchScratchpad } from "./scratchpad.ts";

export type InstanceIncidentState = {
  index: string[]; // grow only set
  deleted: string[]; // grow only set
  values: Record<string, Incident>;
};

export type InstanceScratchpadState<
  S extends BaseMatchScratchpad = MatchScratchpad,
> = {
  index: string[]; // grow only set
  values: Record<string, S>;
};

export type InstanceState<S extends BaseMatchScratchpad = MatchScratchpad> = {
  incidents: InstanceIncidentState;
  scratchpads: InstanceScratchpadState<S>;
};

export type SyncStateOptions<S extends BaseMatchScratchpad = MatchScratchpad> =
  {
    local: InstanceState<S>;
    remote: InstanceState<S>;
  };

export type SyncIncidentStateResults = {
  resolved: InstanceIncidentState;
  notify: Omit<InstanceIncidentState, "values">;
};

/**
 * Synchronizes incident state together, and gives back:
 *  resolved
 *  - For index and deleted, the new value of the GrowSet
 *  - For values, all values that were updated by remote in the sync
 *
 * notify:
 * -
 *
 * @param local
 * @param remote
 */
export function syncIncidentState(
  local: InstanceIncidentState,
  remote: InstanceIncidentState
): InstanceIncidentState {
  const result: InstanceIncidentState = {
    index: [],
    deleted: [],
    values: {},
  };

  return result;
}

/**
 * Merge two share instance states together. This is an EXPENSIVE operation, as
 * it will compare every lww register in every incident and scratchpad. You should
 * only
 * @param options { local, remote } - Local and remote states
 */
export function mergeState<S extends BaseMatchScratchpad = MatchScratchpad>({
  local,
  remote,
}: SyncStateOptions<S>): InstanceState<S> {}
