import createClient from "openapi-fetch";
import { Question, type paths } from "@referee-fyi/rules/qnaplus";

import { get, set } from "./keyval";

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

export async function setQuestion(question: Question) {
  return set(`qna_${question.id}`, question);
}

export async function updateQNAs() {
  const version = await getQNAPlusVersion();

  const response = await client.GET("/internal/update", {
    params: { query: { version } },
  });

  if (!response.data) {
    return null;
  }

  if (response.data.version) {
    await setQNAPlusVersion(response.data.version);
  }
}
