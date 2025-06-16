import createClient from "openapi-fetch";
import type { paths } from "@referee-fyi/rules/generated/qnaplus";

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
