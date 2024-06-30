import { getMany, keys } from "idb-keyval";
import { PRIVATE_KEY } from "./crypto";

const TOKEN = import.meta.env.VITE_LOGSERVER_TOKEN;

export type IssueReportMetadata = {
  email: string;
  comment: string;
};

export type IssueReportResponse = {
  correlation: string;
};

const EXCLUDE_KEYS = [PRIVATE_KEY];

export async function reportIssue(
  metadata: IssueReportMetadata
): Promise<IssueReportResponse> {
  let body =
    [
      `Email: ${metadata.email}`,
      `Comment: ${metadata.comment}`,
      `Version: ${__REFEREE_FYI_VERSION__}`,
      `Date: ${new Date().toISOString()}`,
      `User-Agent: ${navigator.userAgent}`,
    ].join("\n") + "\n\n--\n\n";

  const allKeys = (await keys()).filter(
    (k) => !EXCLUDE_KEYS.includes(k.toString())
  );
  const allValues = await getMany(allKeys);

  body += allKeys
    .map((key, i) => `${key}\n${JSON.stringify(allValues[i], null, 2)}`)
    .join("\n\n");

  const response = await fetch("https://logs.bren.app/dump", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    body,
  });

  const resp: IssueReportResponse = await response.json();
  return resp;
}
