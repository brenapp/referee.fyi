import type { Color } from "robotevents";
import { ConsistentMap, WithLWWConsistency } from "@referee-fyi/consistency";
import { IncidentMatchHeadToHead } from "./incident.js";

export type SupportedGame = "High Stakes" | "Rapid Relay";

export type ScratchpadForGame = {
  "High Stakes": BaseHighStakesMatchScratchpad;
  "Rapid Relay": BaseRapidRelayMatchScratchpad;
};

export type BaseMatchScratchpad = {
  id: string;
  game: SupportedGame;
  event: string;
  match: IncidentMatchHeadToHead;
  notes: string;
};
export const SCRATCHPAD_IGNORE = [
  "game",
  "event",
  "match",
  "notes",
  "id",
] as const;
export type ScratchpadUnchangeableProperties =
  (typeof SCRATCHPAD_IGNORE)[number];

export type HighStakesMatchScratchpadProperties = {
  game: "High Stakes";
  awp: Record<Color, boolean>;
  auto: Color | "tie" | "none";
  timeout_used: Record<Color, boolean>;
};

export type BaseHighStakesMatchScratchpad = BaseMatchScratchpad &
  HighStakesMatchScratchpadProperties;

export type HighStakesMatchScratchpad = WithLWWConsistency<
  BaseHighStakesMatchScratchpad,
  ScratchpadUnchangeableProperties
>;

export type RapidRelayCounterType = "pass" | "goal";
export type BaseRapidRelayCounter = {
  id: string;
  type: RapidRelayCounterType;
};

export type RapidRelayCounter = WithLWWConsistency<BaseRapidRelayCounter, "id">;

export type RapidRelayMatchScratchpadProperties = {
  game: "Rapid Relay";
  counters: ConsistentMap<RapidRelayCounter>;
};
export type BaseRapidRelayMatchScratchpad = BaseMatchScratchpad &
  RapidRelayMatchScratchpadProperties;

export type RapidRelayMatchScratchpad = WithLWWConsistency<
  BaseRapidRelayMatchScratchpad,
  ScratchpadUnchangeableProperties
>;

export type MatchScratchpad =
  | HighStakesMatchScratchpad
  | RapidRelayMatchScratchpad;

export type EditScratchpad<T extends MatchScratchpad> = Omit<
  T,
  ScratchpadUnchangeableProperties
>;
