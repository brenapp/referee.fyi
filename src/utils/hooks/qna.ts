import { Question } from "@referee-fyi/rules/qnaplus";
import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { ProgramAbbr, Year } from "robotevents";
import { getQuestionsByProgram } from "~utils/data/qna";
import { HookQueryOptions } from "./robotevents";

export function getUseQuestionsForProgramQueryParams(
  program: ProgramAbbr,
  season: Year,
  options?: HookQueryOptions<Question[]>
): UseQueryOptions<Question[]> {
  return {
    queryKey: ["@referee-fyi/useQuestionsForProgram", program, season],
    queryFn: async () => getQuestionsByProgram(program, season),
    ...options,
  };
}

export function useQuestionsForProgram(
  program: ProgramAbbr,
  season: Year,
  options?: HookQueryOptions<Question[]>
): UseQueryResult<Question[]> {
  return useQuery(
    getUseQuestionsForProgramQueryParams(program, season, options)
  );
}
