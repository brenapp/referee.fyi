import { z } from "zod/v4";
import type { Color } from "robotevents";
import {
  LastWriteWinsConsistencySchema,
  WithLWWConsistency,
} from "@referee-fyi/consistency";
import { IncidentMatchHeadToHeadSchema } from "./incident.js";

export const BaseMatchScratchpadSchema = z.looseObject({
  id: z.string(),
  event: z.string(),
  match: IncidentMatchHeadToHeadSchema,
  notes: z.string().optional(),
});

export type BaseMatchScratchpad = z.infer<typeof BaseMatchScratchpadSchema>;

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

export const MatchScratchpadSchema = BaseMatchScratchpadSchema.extend({
  consistency: LastWriteWinsConsistencySchema(z.string()),
});

export type Scratchpads = {
  DefaultV5RC: DefaultV5RCMatchScratchpad;
  DefaultVIQRC: DefaultVIQRCMatchScratchpad;
};

export type ScratchpadKind = keyof Scratchpads;

export type EditScratchpad<T extends MatchScratchpad> = Omit<
  T,
  ScratchpadUnchangeableProperties
>;
