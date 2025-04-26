import { z } from "zod";
import { WithLWWConsistency } from "@referee-fyi/consistency";

export const IncidentOutcomeSchema = z.enum([
  "Minor",
  "Major",
  "Disabled",
  "General",
  "Inspection",
]);

export type IncidentOutcome = z.infer<typeof IncidentOutcomeSchema>;

export const IncidentMatchHeadToHeadSchema = z.object({
  type: z.literal("match"),
  division: z.number(),
  name: z.string(),
  id: z.number(),
});
export const IncidentMatchSkillsSchema = z.object({
  type: z.literal("skills"),
  skillsType: z.enum(["driver", "programming"]),
  attempt: z.number(),
});

export const IncidentMatchSchema = z.discriminatedUnion("type", [
  IncidentMatchHeadToHeadSchema,
  IncidentMatchSkillsSchema,
]);

export type IncidentMatchHeadToHead = z.infer<
  typeof IncidentMatchHeadToHeadSchema
>;

export type IncidentMatchSkills = z.infer<typeof IncidentMatchSkillsSchema>;
export type IncidentMatch = z.infer<typeof IncidentMatchSchema>;

export const BaseIncidentSchema = z.object({
  id: z.string(),
  time: z.date(),
  event: z.string(), // SKU
  match: IncidentMatchSchema.optional(),
  team: z.string(), // team number
  outcome: IncidentOutcomeSchema,
  rules: z.array(z.string()),
  notes: z.string(),
  assets: z.array(z.string()),
});

export type BaseIncident = z.infer<typeof BaseIncidentSchema>;

export const INCIDENT_IGNORE = ["id", "time", "event", "team"] as const;
export type IncidentUnchangeableProperties = (typeof INCIDENT_IGNORE)[number];

export type Incident = WithLWWConsistency<
  BaseIncident,
  IncidentUnchangeableProperties
>;

export type EditIncident = Omit<BaseIncident, IncidentUnchangeableProperties>;
