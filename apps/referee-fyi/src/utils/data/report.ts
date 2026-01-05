import { getMany, isStoragePersisted, keys } from "~utils/data/keyval";
import { KEY } from "./crypto";
import { getShareProfile, getShareSessionID } from "./share";
import { FallbackRender, sendFeedback } from "@sentry/react";

const TOKEN = import.meta.env.VITE_LOGSERVER_TOKEN;

export type ErrorReport = Parameters<FallbackRender>[0];

export type IssueReportMetadata = {
  email: string;
  comment: string;
  context: string;
  error?: ErrorReport;
};

export type IssueReportResponse = {
  correlation: string;
};

const EXCLUDE_KEYS = [(k) => k === KEY] satisfies ((
  k: IDBValidKey
) => boolean)[];

export async function reportIssue(
  sku: string | null,
  metadata: IssueReportMetadata
): Promise<IssueReportResponse> {
  const profile = await getShareProfile();
  const date = new Date().toISOString();
  const frontmatter = [
    [`Email`, metadata.email],
    [`Comment`, metadata.comment],
    [`Version`, __REFEREE_FYI_VERSION__],
    [`Session`, await getShareSessionID()],
    [`Key`, profile.key],
    [`Name`, profile.name],
    [`Date`, date],
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
  const dump = body.join("\n\n--\n\n");

  // Report Feedback to Sentry

  let sentryId = null;
  try {
    sentryId = await sendFeedback(
      {
        name: profile.name,
        message: metadata.comment || "No comment provided",
        email: metadata.email,
        url: window.location.toString(),
        associatedEventId: metadata.error?.eventId,
      },
      {
        data: frontmatter,
        attachments: [{ filename: `referee-fyi-dump-${date}.txt`, data: dump }],
        includeReplay: false,
        originalException: metadata.error?.error,
      }
    );
    frontmatter.push(["Sentry ID", sentryId]);
  } catch (e) {
    frontmatter.push(["Sentry Error", `${e}`]);
  }

  const headers = new Headers();

  headers.set("Authorization", `Bearer ${TOKEN}`);
  headers.set(
    "X-Log-Server-Frontmatter",
    JSON.stringify(Object.fromEntries(frontmatter))
  );

  const response = await fetch("https://logs.bren.app/dump", {
    method: "PUT",
    headers,
    body: dump,
  });

  const resp: IssueReportResponse = await response.json();
  return resp;
}
