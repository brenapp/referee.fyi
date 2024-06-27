import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { EventData } from "robotevents/out/endpoints/events";
import { ProgramAbbr } from "robotevents/out/endpoints/programs";
import { Season, Year } from "robotevents/out/endpoints/seasons";
import { useSeason } from "./robotevents";

export type Rule = {
  rule: string;
  description: string;
  link: string;
};

export type RuleGroup = {
  name: string;
  programs: ProgramAbbr[];
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

      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useGameRules(game: string): Game | undefined {
  const { data: rules } = useRules();
  return rules?.games.find((g) => g.title === game) as Game | undefined;
}

export function useRulesForSeason(season?: Season | null): Game | undefined {
  const { data: rules } = useRules();

  if (!season) {
    return undefined;
  }

  const year = (season.years_start + "-" + season.years_end) as Year;
  const currentGame = rules?.games.find(
    (g) => g.season === year && g.programs.includes(season.program.code)
  ) as Game | undefined;

  if (!currentGame) {
    return undefined;
  }

  const relevantRuleGroups: RuleGroup[] = [];

  currentGame?.ruleGroups.forEach((ruleGroup) => {
    if (ruleGroup.programs.includes(season.program.code)) {
      relevantRuleGroups.push(ruleGroup);
    }
  });

  return { ...currentGame, ruleGroups: relevantRuleGroups };
}

export function useRulesForEvent(event?: EventData | null): Game | undefined {
  const { data: season } = useSeason(event?.season.id);
  return useRulesForSeason(season);
}
