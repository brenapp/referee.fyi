import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { EventData, ProgramAbbr, Season, Year } from "robotevents";
import { HookQueryOptions, useSeason } from "./robotevents";
import { GAME_FETCHERS } from "~utils/data/rules";

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

      return GAME_FETCHERS[season.id]?.() ?? null;
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
