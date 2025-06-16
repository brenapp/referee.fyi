import createClient from "openapi-fetch";
import type { Question, paths } from "@referee-fyi/rules/qnaplus";
import type { ProgramAbbr, Year } from "robotevents";

const programs: Partial<Record<ProgramAbbr, ProgramAbbr[]>> = {
  V5RC: ["V5RC", "VURC", "VAIRC"],
  VURC: ["VURC", "VAIRC"],
  VAIRC: ["VAIRC"],
  VIQRC: ["VIQRC"],
};

export type CurrentVersion = {
  version: string;
  date: string;
};

export async function getCurrentQNAPlusVersion(
  env: Env
): Promise<CurrentVersion> {
  const version = await env.qnaplus.get<CurrentVersion>(
    "current-version",
    "json"
  );

  return (
    version ?? {
      version: "",
      date: new Date().toISOString(),
    }
  );
}

export async function setCurrentQNAPlusVersion(
  env: Env,
  version: string
): Promise<void> {
  await env.qnaplus.put(
    "current-version",
    JSON.stringify({ version, date: new Date().toISOString() }, null, 2)
  );
}

const client = createClient<paths>({
  baseUrl: "https://api.qnapl.us",
});
function getQuestionContent(question: Question): string {
  return `
---
id: ${question.id}
title: ${question.title}
url: ${question.url}
author: ${question.author}
asked: ${new Date(question.askedTimestampMs).toLocaleString()}
${question.answeredTimestampMs ? `answered: ${new Date(question.answeredTimestampMs).toLocaleString()}` : ""}
${question.tags.length > 0 ? `tags: ${question.tags.join(", ")}` : ""}
---

# ${question.title}
By ${question.author} on ${new Date(question.askedTimestampMs).toLocaleDateString()}

## Question
${question.question}

## Answer
${question.answer ?? "Not answered yet."}
`;
}

async function indexQuestion(env: Env, question: Question) {
  const program = question.program as ProgramAbbr;
  const year = question.season as Year;
  const programsToIndex = programs[program] ?? [program];

  const content = getQuestionContent(question);
  for (const program of programsToIndex) {
    const path = `${program}_${year}/qna_${question.id}.md`;
    await env.rules.put(path, content, {
      customMetadata: {
        id: question.id,
        program: program,
        title: question.title,
        author: question.author,
        askedTimestampMs: new Date(question.askedTimestampMs).toISOString(),
        answeredTimestampMs: question.answeredTimestampMs
          ? new Date(question.answeredTimestampMs).toISOString()
          : "",
        tags: question.tags.join(", "),
        url: question.url,
      },
    });

    await env.qnaplus.put(
      `qna_${question.id}`,
      JSON.stringify(question, null, 2)
    );
  }
}

export async function fetchUpdatedQNAs(env: Env) {
  const currentVersion = await getCurrentQNAPlusVersion(env);

  const result = await client.GET("/internal/update", {
    params: { query: { version: currentVersion.version } },
  });

  if (result.error) {
    return;
  }

  if (!result.data?.outdated) {
    return;
  }

  for (const question of result.data.questions ?? []) {
    await indexQuestion(env, question);
  }

  if (result.data?.version) {
    await setCurrentQNAPlusVersion(env, result.data.version);
  }
}
