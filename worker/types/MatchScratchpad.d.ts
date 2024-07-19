import { IncidentMatchHeadToHead } from "./EventIncidents";
import { WithRevision } from "./revision";
import { Color } from "robotevents/out/endpoints/matches";

export type UnchangeableProperties = "event" | "match" | "revision" | "game";

export type SupportedGame = "High Stakes" | "Rapid Relay";

export type ScratchpadForGame = {
  [SupportedGame.HighStakes]: HighStakesMatchScratchpad;
  [SupportedGame.RapidRelay]: RapidRelayMatchScratchpad;
};

export type BaseMatchScratchpad = {
  game: SupportedGame;
  event: string;
  match: IncidentMatchHeadToHead;
  notes: string;
};

export type HighStakesMatchScratchpadProperties = {
  game: "High Stakes";
  awp: Record<Color, boolean>;
  auto: Color | "tie" | "none";
};

export type HighStakesMatchScratchpad = WithRevision<
  BaseMatchScratchpad & HighStakesMatchScratchpadProperties,
  UnchangeableProperties
>;

export type RapidRelayMatchScratchpadProperties = {
  game: "Rapid Relay";
};

export type RapidRelayMatchScratchpad = WithRevision<
  BaseMatchScratchpad & RapidRelayMatchScratchpadProperties,
  UnchangeableProperties
>;

export type MatchScratchpad =
  | HighStakesMatchScratchpad
  | RapidRelayMatchScratchpad;

export type EditScratchpad<T extends MatchScratchpad> = Omit<
  T,
  UnchangeableProperties
>;
