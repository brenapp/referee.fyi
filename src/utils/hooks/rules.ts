import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { EventData } from "robotevents/out/endpoints/events";
import { ProgramAbbr } from "robotevents/out/endpoints/programs";
import { Year } from "robotevents/out/endpoints/seasons";
import { useSeason } from "./robotevents";

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
  return useQuery({
    queryKey: ["rules"],
    queryFn: async () => {
      const response = await fetch("/rules.json");
      if (!response.ok) {
        return { games: [] };
      }
      return response.json() as Promise<Rules>;
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useGameRules(game: string): Game | undefined {
  const { data: rules } = useRules();
  return rules?.games.find((g) => g.title === game) as Game | undefined;
}

export function useRulesForProgram(
  program?: ProgramAbbr,
  year: Year = "2024-2025"
): Game | undefined {
  const { data: rules } = useRules();
  if (!program) return undefined;
  return rules?.games.find(
    (g) => g.season === year && g.programs.includes(program)
  ) as Game | undefined;
}

export function useRulesForEvent(event?: EventData | null) {
  const { data: rules } = useRules();
  const { data: season } = useSeason(event?.season.id);

  if (!event || !rules || !season) {
    return undefined;
  }

  const year = (season.years_start + "-" + season.years_end) as Year;
  return rules?.games.find(
    (g) => g.season === year && g.programs.includes(event.program.code)
  ) as Game | undefined;
}
