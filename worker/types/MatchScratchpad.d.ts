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

export type HighStakesMatchScratchpad = WithRevision<
  BaseMatchScratchpad & {
    game: "High Stakes";
    awp: Record<Color, boolean>;
    auto: Color | "tie" | "none";
  },
  UnchangeableProperties
>;

export type RapidRelayMatchScratchpad = WithRevision<
  BaseMatchScratchpad & {
    game: "Rapid Relay";
  },
  UnchangeableProperties
>;

export type MatchScratchpad =
  | HighStakesMatchScratchpad
  | RapidRelayMatchScratchpad;

export type EditScratchpad<T extends MatchScratchpad> = Omit<
  T,
  UnchangeableProperties
>;
