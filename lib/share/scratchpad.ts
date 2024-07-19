import type { Color } from "robotevents/out/endpoints/matches.js";
import { WithLWWConsistency } from "@referee-fyi/consistency";
import { IncidentMatchHeadToHead } from "./incident.js";

export type SupportedGame = "High Stakes" | "Rapid Relay";

export type ScratchpadForGame = {
  "High Stakes": HighStakesMatchScratchpad;
  "Rapid Relay": RapidRelayMatchScratchpad;
};

export type BaseMatchScratchpad = {
  game: SupportedGame;
  event: string;
  match: IncidentMatchHeadToHead;
  notes: string;
};
export const SCRATCHPAD_IGNORE = ["game", "event", "match", "notes"] as const;
export type ScratchpadUnchangeableProperties =
  (typeof SCRATCHPAD_IGNORE)[number];

export type HighStakesMatchScratchpadProperties = {
  game: "High Stakes";
  awp: Record<Color, boolean>;
  auto: Color | "tie" | "none";
};

export type HighStakesMatchScratchpad = BaseMatchScratchpad &
  HighStakesMatchScratchpadProperties;

export type RapidRelayMatchScratchpadProperties = {
  game: "Rapid Relay";
};
export type RapidRelayMatchScratchpad = BaseMatchScratchpad &
  RapidRelayMatchScratchpadProperties;

export type MatchScratchpad = WithLWWConsistency<
  HighStakesMatchScratchpad | RapidRelayMatchScratchpad,
  ScratchpadUnchangeableProperties
>;

export type EditScratchpad<T extends MatchScratchpad> = Omit<
  T,
  ScratchpadUnchangeableProperties
>;
