import {
	type UseQueryOptions,
	type UseQueryResult,
	useQuery,
} from "@tanstack/react-query";
import type { ProgramAbbr, Year } from "robotevents";
import type { Question } from "~types/worker/rules";
import { getQuestionsByProgram } from "~utils/data/qna";
import { relatedPrograms } from "../../../../../lib/rules/src/programs";
import type { HookQueryOptions } from "./robotevents";

export function getUseQuestionsForProgramQueryParams(
	program: ProgramAbbr,
	season: Year,
	includeRelatedPrograms?: boolean,
	options?: HookQueryOptions<Question[]>,
): UseQueryOptions<Question[]> {
	return {
		queryKey: [
			"@referee-fyi/useQuestionsForProgram",
			program,
			season,
			includeRelatedPrograms,
		],
		queryFn: async () => {
			const programs = includeRelatedPrograms
				? (relatedPrograms[program] ?? [program])
				: [program];

			return Promise.all(
				programs.map((program) => getQuestionsByProgram(program, season)),
			).then((results) => results.flat());
		},
		...options,
	};
}

export function useQuestionsForProgram(
	program: ProgramAbbr,
	season: Year,
	includeRelatedPrograms?: boolean,
	options?: HookQueryOptions<Question[]>,
): UseQueryResult<Question[]> {
	return useQuery(
		getUseQuestionsForProgramQueryParams(
			program,
			season,
			includeRelatedPrograms,
			options,
		),
	);
}
