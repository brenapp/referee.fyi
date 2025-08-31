import { z } from "zod/v4";
import { LastWriteWinsConsistencySchema } from "@referee-fyi/consistency";

export const OUTCOMES = [
  "General",
  "Minor",
  "Major",
  "Inspection",
  "Disabled",
] as const;

export const IncidentOutcomeSchema = z.enum(OUTCOMES).meta({
  id: "IncidentOutcome",
  description: "The referee determined outcome of the incident.",
});

export type IncidentOutcome = z.infer<typeof IncidentOutcomeSchema>;

export const IncidentMatchHeadToHeadSchema = z.object({
  type: z.literal("match"),
  division: z.number(),
  name: z.string(),
  id: z.number(),
});

export type IncidentMatchHeadToHead = z.infer<
  typeof IncidentMatchHeadToHeadSchema
>;

export const IncidentMatchSkillsSchema = z.object({
  type: z.literal("skills"),
  skillsType: z.enum(["driver", "programming"]),
  attempt: z.number(),
});
export type IncidentMatchSkills = z.infer<typeof IncidentMatchSkillsSchema>;

export const IncidentMatchSchema = z.discriminatedUnion("type", [
  IncidentMatchHeadToHeadSchema,
  IncidentMatchSkillsSchema,
]);
export type IncidentMatch = z.infer<typeof IncidentMatchSchema>;

export const FLAGS = ["judge"] as const;
export const IncidentFlagSchema = z.enum(FLAGS).meta({
  id: "IncidentFlag",
  description: "Flags that can be applied to an incident.",
});
export type IncidentFlag = z.infer<typeof IncidentFlagSchema>;

export const BaseIncidentSchema = z
  .object({
    id: z.string(),
    time: z.string().meta({
      description: "ISO 8601 timestamp of when the incident occurred.",
    }),
    event: z.string().meta({ description: "Event Code" }),
    match: IncidentMatchSchema.optional(),
    team: z.string().meta({ description: "Team Number" }),
    outcome: IncidentOutcomeSchema,
    rules: z
      .array(z.string())
      .meta({ description: "Cited rules in the violation, in the form <SG1>" }),
    notes: z.string(),
    assets: z.array(z.string()).meta({
      description: "Asset IDs associated with the incident.",
    }),
    flags: z.array(IncidentFlagSchema),
  })
  .meta({
    id: "BaseIncident",
    description: "A violation for a team at an event.",
  });
export type BaseIncident = z.infer<typeof BaseIncidentSchema>;

export const INCIDENT_IGNORE = ["id", "time", "event", "team"] as const;

export const INCIDENT_INCLUDE = [
  "match",
  "outcome",
  "rules",
  "notes",
  "assets",
  "flags",
] as const satisfies readonly (keyof {
  [K in Exclude<keyof BaseIncident, (typeof INCIDENT_IGNORE)[number]>]: K;
})[];

export const IncidentIgnoreSchema = z.enum(INCIDENT_IGNORE).meta({
  id: "IncidentIgnore",
});
export type IncidentUnchangeableProperties = z.infer<
  typeof IncidentIgnoreSchema
>;

export const IncidentSchema = BaseIncidentSchema.extend({
  consistency: LastWriteWinsConsistencySchema(z.enum(INCIDENT_INCLUDE)),
});

export type Incident = z.infer<typeof IncidentSchema>;
export type EditIncident = Omit<BaseIncident, IncidentUnchangeableProperties>;

export function incidentMatchNameToString(match?: IncidentMatch) {
  if (!match) return "Non-Match";

  switch (match.type) {
    case "match": {
      return match.name;
    }
    case "skills": {
      const display: Record<typeof match.skillsType, string> = {
        programming: "Auto",
        driver: "Driver",
      };
      return `${display[match.skillsType]} Skills ${match.attempt}`;
    }
  }
}
