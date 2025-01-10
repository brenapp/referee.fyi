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
};

export type Rules = {
  games: Game[];
};

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

      return {
        ...game,
        ruleGroups,
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
