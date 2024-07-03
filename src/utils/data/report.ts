import { getMany, keys } from "idb-keyval";
import { PRIVATE_KEY } from "./crypto";
import { CACHE_PREFIX } from "./query";
import { getShareSessionID } from "./share";

const TOKEN = import.meta.env.VITE_LOGSERVER_TOKEN;

export type IssueReportMetadata = {
  email: string;
  comment: string;
};

export type IssueReportResponse = {
  correlation: string;
};

const EXCLUDE_KEYS = [
  (k) => k === PRIVATE_KEY,
  (k) => k.toString().startsWith(CACHE_PREFIX),
] satisfies ((k: IDBValidKey) => boolean)[];

export async function reportIssue(
  sku: string | null,
  metadata: IssueReportMetadata
): Promise<IssueReportResponse> {
  const frontmatter = [
    [`Email`, metadata.email],
    [`Comment`, metadata.comment],
    [`Version`, __REFEREE_FYI_VERSION__],
    [`Session`, await getShareSessionID()],
    [`Date`, new Date().toISOString()],
    [`User-Agent`, navigator.userAgent],
    [`SKU`, sku],
    [`URL`, window.location.toString()],
  ];

  let body = frontmatter.map((v) => v.join(":")).join("\n") + "\n\n--\n\n";

  const allKeys = (await keys()).filter(
    (k) => !EXCLUDE_KEYS.some((fn) => fn(k))
  );
  const allValues = await getMany(allKeys);

  body += allKeys
    .map((key, i) => `${key}\n${JSON.stringify(allValues[i], null, 2)}`)
    .join("\n\n");

  const headers = new Headers();

  headers.set("Authorization", `Bearer ${TOKEN}`);
  headers.set(
    "X-Log-Server-Frontmatter",
    JSON.stringify(Object.fromEntries(frontmatter))
  );

  const response = await fetch("https://logs.bren.app/dump", {
    method: "PUT",
    headers,
    body,
  });

  const resp: IssueReportResponse = await response.json();
  return resp;
}
