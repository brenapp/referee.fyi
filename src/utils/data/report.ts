import { getMany, isStoragePersisted, keys } from "~utils/data/keyval";
import { KEY } from "./crypto";
import { CACHE_PREFIX } from "./query";
import { getPeer, getShareName, getShareSessionID } from "./share";

const TOKEN = import.meta.env.VITE_LOGSERVER_TOKEN;

export type IssueReportMetadata = {
  email: string;
  comment: string;
  context: string;
};

export type IssueReportResponse = {
  correlation: string;
};

const EXCLUDE_KEYS = [
  (k) => k === KEY,
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
    [`Peer`, await getPeer()],
    [`Name`, await getShareName()],
    [`Date`, new Date().toISOString()],
    [`User-Agent`, navigator.userAgent],
    [`SKU`, sku],
    [`URL`, window.location.toString()],
    [`Storage Persisted`, (await isStoragePersisted()) ? "Yes" : "No"],
  ];

  const body: string[] = [];

  body.push(frontmatter.map((v) => v.join(": ")).join("\n"));

  if (metadata.context) {
    body.push(metadata.context);
  }

  const allKeys = (await keys()).filter(
    (k) => !EXCLUDE_KEYS.some((fn) => fn(k))
  );
  const allValues = await getMany(allKeys);

  body.push(
    allKeys
      .map((key, i) => `${key}\n${JSON.stringify(allValues[i], null, 2)}`)
      .join("\n\n")
  );

  const headers = new Headers();

  headers.set("Authorization", `Bearer ${TOKEN}`);
  headers.set(
    "X-Log-Server-Frontmatter",
    JSON.stringify(Object.fromEntries(frontmatter))
  );

  const response = await fetch("https://logs.bren.app/dump", {
    method: "PUT",
    headers,
    body: body.join("\n\n--\n\n"),
  });

  const resp: IssueReportResponse = await response.json();
  return resp;
}
