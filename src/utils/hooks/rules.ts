import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { EventData, ProgramAbbr, Season, Year } from "robotevents";
import { HookQueryOptions, useSeason } from "./robotevents";
import { GAME_FETCHERS } from "~utils/data/rules";

export type Rule = {
  rule: string;
  description: string;
  link: string;
  icon?: string;
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
  rulesLookup?: Record<string, Rule>;
};

export type Rules = {
  games: Game[];
};

function createRulesLookup(ruleGroups: RuleGroup[]): Record<string, Rule> {
  const lookup: Record<string, Rule> = {};
  ruleGroups.forEach((group) => {
    group.rules.forEach((rule) => {
      lookup[rule.rule] = rule;
    });
  });
  return lookup;
}

export function useRulesForSeason(
  season?: Season | null,
  options?: HookQueryOptions<Game | null>
): UseQueryResult<Game | null> {
  return useQuery({
    queryKey: ["@referee-fyi/useRulesForSeason", season?.id],
    queryFn: async () => {
      if (!season || !season.id) {
        return null;
      }

      const game = (await GAME_FETCHERS[season.id]?.()) ?? null;
      const ruleGroups = game.ruleGroups.filter((group) =>
        group.programs.includes(season.program?.code as ProgramAbbr)
      );

      const rulesLookup = createRulesLookup(ruleGroups);

      return {
        ...game,
        ruleGroups,
        rulesLookup,
      };
    },
    ...options,
  });
}

export function useRulesForEvent(
  event?: EventData | null
): UseQueryResult<Game | null> {
  const { data: season } = useSeason(event?.season.id);
  return useRulesForSeason(season);
}
