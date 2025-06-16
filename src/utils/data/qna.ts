import createClient from "openapi-fetch";
import { Question, type paths } from "@referee-fyi/rules/qnaplus";

import { get, set } from "./keyval";
import { ProgramAbbr, Year } from "robotevents";
import { getMany } from "idb-keyval";
import { captureException } from "@sentry/react";

export const client = createClient<paths>({
  baseUrl: "https://api.qnapl.us",
});

export async function getQNAPlusVersion() {
  return (await get<string>("qnaplus_version")) ?? "";
}

export async function setQNAPlusVersion(version: string) {
  return set("qnaplus_version", version);
}

export async function getQuestion(id: string) {
  return get<Question>(`qna_${id}`);
}

export async function indexQuestion(question: Question) {
  const all = (await get<Set<string>>("qna_all_idx")) ?? new Set<string>();
  const program =
    (await get<string[]>(
      `qna_program_${question.program}_${question.season}_idx`
    )) ?? [];

  all.add(question.id);
  program.push(question.id);

  await set("qna_all_idx", all);
  await set(`qna_program_${question.program}_${question.season}_idx`, program);
}

export async function getQuestionsByProgram(
  program: ProgramAbbr,
  season: Year
): Promise<Question[]> {
  const ids =
    (await get<string[]>(`qna_program_${program}_${season}_idx`)) ?? [];
  const questions = await getMany<Question>(ids.map((id) => `qna_${id}`));
  return questions.filter((q): q is Question => q !== null);
}

export async function getAllQuestions(): Promise<Question[]> {
  const ids = (await get<Set<string>>("qna_all_idx")) ?? new Set<string>();
  const questions = await getMany<Question>(
    Array.from(ids).map((id) => `qna_${id}`)
  );
  return questions.filter((q): q is Question => q !== null);
}

export async function setQuestion(question: Question) {
  await indexQuestion(question);
  return set(`qna_${question.id}`, question);
}

export async function updateQNAs() {
  const version = await getQNAPlusVersion();

  try {
    const response = await client.GET("/internal/update", {
      params: { query: { version } },
    });

    if (!response.data) {
      return null;
    }

    if (response.data.version) {
      await setQNAPlusVersion(response.data.version);
    }

    if (!response.data.questions) {
      return null;
    }
    const questions = response.data.questions;
    for (const question of questions) {
      await setQuestion(question);
    }
  } catch (error) {
    captureException(error, {});
  }
}

export async function getUpdatedQuestionsForProgram(
  program: ProgramAbbr,
  season: Year
): Promise<Question[]> {
  await updateQNAs();
  return getQuestionsByProgram(program, season);
}
