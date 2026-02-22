import type { Game as BaseGame, Rule, RuleGroup } from "@referee-fyi/rules";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import type { EventData, ProgramAbbr, Year } from "robotevents";
import { GAME_FETCHERS } from "~utils/data/rules";
import { type HookQueryOptions, useSeason } from "./robotevents";
export type { Rule, RuleGroup };

export type Game = BaseGame & {
	rulesLookup: Record<string, Rule>;
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

export function getUseRulesForSeasonQueryParams(
	program?: ProgramAbbr | null,
	year?: Year | null,
	options?: HookQueryOptions<Game | null>,
) {
	return {
		queryKey: ["@referee-fyi/useRulesForSeason", program, year],
		queryFn: async () => {
			if (!program || !year) {
				return null;
			}

			const game = (await GAME_FETCHERS[`${program}_${year}`]?.()) ?? null;

			if (!game) {
				return null;
			}

			const ruleGroups = game.ruleGroups.filter((group) =>
				group.programs.includes(program),
			);

			const rulesLookup = createRulesLookup(ruleGroups);

			return {
				...game,
				ruleGroups,
				rulesLookup,
			};
		},
		...options,
	};
}

export function useRulesForSeason(
	program?: ProgramAbbr | null,
	year?: Year | null,
	options?: HookQueryOptions<Game | null>,
): UseQueryResult<Game | null> {
	return useQuery(getUseRulesForSeasonQueryParams(program, year, options));
}

export function useRulesForEvent(
	event?: EventData | null,
): UseQueryResult<Game | null> {
	const { data: season } = useSeason(event?.season.id);
	const year = (
		season ? `${season.years_start}-${season.years_end}` : null
	) as Year | null;
	return useRulesForSeason(season?.program?.code as ProgramAbbr | null, year);
}
