import type { Color } from "robotevents";
import { WithLWWConsistency } from "@referee-fyi/consistency";
import { IncidentMatchHeadToHead } from "./incident.js";

export type BaseMatchScratchpad = {
  id: string;
  event: string;
  match: IncidentMatchHeadToHead;
  notes: string;
};
export const SCRATCHPAD_IGNORE = ["event", "match", "notes", "id"] as const;
export type ScratchpadUnchangeableProperties =
  (typeof SCRATCHPAD_IGNORE)[number];

export type DefaultV5RCMatchScratchpadProperties = {
  awp: Record<Color, boolean>;
  auto: Color | "tie" | "none";
  timeout: Record<Color, boolean>;
};

export type BaseDefaultV5RCMatchScratchpad = BaseMatchScratchpad &
  DefaultV5RCMatchScratchpadProperties;

export type DefaultV5RCMatchScratchpad = WithLWWConsistency<
  BaseDefaultV5RCMatchScratchpad,
  ScratchpadUnchangeableProperties
>;

export type DefaultVIQRCMatchScratchpadProperties = BaseMatchScratchpad;
export type BaseDefaultVIQRCMatchScratchpad = BaseMatchScratchpad &
  DefaultVIQRCMatchScratchpadProperties;

export type DefaultVIQRCMatchScratchpad = WithLWWConsistency<
  BaseDefaultVIQRCMatchScratchpad,
  ScratchpadUnchangeableProperties
>;

export type MatchScratchpad =
  | DefaultV5RCMatchScratchpad
  | DefaultVIQRCMatchScratchpad;

export type Scratchpads = {
  DefaultV5RC: DefaultV5RCMatchScratchpad;
  DefaultVIQRC: DefaultVIQRCMatchScratchpad;
};

export type ScratchpadKind = keyof Scratchpads;

export type EditScratchpad<T extends MatchScratchpad> = Omit<
  T,
  ScratchpadUnchangeableProperties
>;
