import { ProgramAbbrSchema, RuleSchema, YearSchema } from "@referee-fyi/rules";
import { z } from "zod/v4";

export const RulesIndexMetadataSchema = z.object({
  programs: z.array(ProgramAbbrSchema).meta({
    description: "The programs this rule applies to",
  }),
  year: YearSchema,
  rule: RuleSchema,
  group: z.string(),
});

export type RulesIndexMetadata = z.infer<typeof RulesIndexMetadataSchema>;
