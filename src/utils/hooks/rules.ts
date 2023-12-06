import { UseQueryResult, useQuery } from "react-query";
import { ProgramAbbr } from "robotevents/out/endpoints/programs";
import { Year } from "robotevents/out/endpoints/seasons";

export type Rule = {
  rule: string;
  description: string;
  link: string;
};

export type RuleGroup = {
  name: string;
  rules: Rule[];
};

export type Game = {
  title: string;
  season: Year;
  programs: ProgramAbbr[];
  ruleGroups: RuleGroup[];
};

export type Rules = {
  games: Game[];
};

export function useRules(): UseQueryResult<Rules> {
  return useQuery(["rules"], async () => {
    const response = await fetch("/rules.json");
    if (!response.ok) {
      return { games: [] };
    }
    return response.json() as Promise<Rules>;
  });
}

export function useGameRules(game: string): Game | undefined {
  const { data: rules } = useRules();
  return rules?.games.find((g) => g.title === game) as Game | undefined;
}

export function useRulesForProgram(
  program?: ProgramAbbr,
  year: Year = "2023-2024"
): Game | undefined {
  const { data: rules } = useRules();
  if (!program) return undefined;
  return rules?.games.find(
    (g) => g.season === year && g.programs.includes(program)
  ) as Game | undefined;
}
