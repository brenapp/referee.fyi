import { z } from "zod/v4";
import { ProgramAbbr, programs, years } from "robotevents";

export const ProgramAbbrSchema = z
  .enum(Object.keys(programs) as ProgramAbbr[])
  .meta({
    id: "ProgramAbbr",
    description: "The program abbreviation",
  });
export const YearSchema = z.enum(years).meta({
  id: "Year",
  description: "The programs this game applies to.",
});

export const RuleSchema = z.object({
  rule: z.string().meta({
    description: "The rule number, include brackets. Like <R1>",
  }),
  description: z.string().meta({
    description: "A single-sentence description of the rule.",
  }),
  link: z.url().meta({
    description: "A link to an HTML page with the rule text.",
  }),
  icon: z.url().optional().meta({
    description: "An optional icon URL for the rule.",
  }),
});

export type Rule = z.infer<typeof RuleSchema>;

export const RuleGroupSchema = z.object({
  name: z.string().meta({
    description: "The name of the rule group.",
  }),
  programs: z
    .array(ProgramAbbrSchema)
    .meta({ description: "The programs this rule group applies to" }),
  rules: z.array(RuleSchema).meta({
    description: "The rules in this group.",
  }),
});

export type RuleGroup = z.infer<typeof RuleGroupSchema>;

export const GameSchema = z
  .object({
    title: z.string().meta({ description: "The game name." }),
    season: YearSchema.meta({ description: "The season year (ex. 2025-2026)" }),
    programs: z.array(ProgramAbbrSchema),
    ruleGroups: z.array(RuleGroupSchema).meta({
      description: "The rule groups for this game.",
    }),
  })
  .meta({
    id: "https://referee.fyi/rules/schema.json",
    title: "Referee FYI Game Schema",
    description: "Describes the shape of Referee FYI game descriptions.",
  });

export type Game = z.infer<typeof GameSchema>;
