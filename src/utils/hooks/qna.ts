import { Question } from "@referee-fyi/rules/qnaplus";
import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { ProgramAbbr, Year } from "robotevents";
import { getQuestionsByProgram } from "~utils/data/qna";
import { HookQueryOptions } from "./robotevents";
import { relatedPrograms } from "../../../lib/rules/src/programs";

export function getUseQuestionsForProgramQueryParams(
  program: ProgramAbbr,
  season: Year,
  includeRelatedPrograms?: boolean,
  options?: HookQueryOptions<Question[]>
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
        programs.map((program) => getQuestionsByProgram(program, season))
      ).then((results) => results.flat());
    },
    ...options,
  };
}

export function useQuestionsForProgram(
  program: ProgramAbbr,
  season: Year,
  includeRelatedPrograms?: boolean,
  options?: HookQueryOptions<Question[]>
): UseQueryResult<Question[]> {
  return useQuery(
    getUseQuestionsForProgramQueryParams(
      program,
      season,
      includeRelatedPrograms,
      options
    )
  );
}
