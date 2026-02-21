import type { LegalPart, LegalPartsList } from "@referee-fyi/rules";
import type { ProgramAbbr, Year } from "robotevents";

export type PartsConfig = {
  spreadsheetId: string;
  sheetName: string;
  program: ProgramAbbr;
  season: Year;
};

type SheetsCellData = {
  formattedValue?: string;
  hyperlink?: string;
};

type SheetsRowData = {
  values?: SheetsCellData[];
};

type SheetsGridData = {
  rowData?: SheetsRowData[];
};

type SheetsSheet = {
  data?: SheetsGridData[];
};

type SheetsResponse = {
  sheets?: SheetsSheet[];
};

function kvKey(program: ProgramAbbr, season: Year): string {
  return `parts:${program}:${season}`;
}

async function getConfigs(env: Env): Promise<PartsConfig[]> {
  const configs: PartsConfig[] = [];
  let cursor: string | undefined;

  do {
    const list = await env.parts.list({ prefix: "config:", cursor });
    for (const key of list.keys) {
      const config = await env.parts.get<PartsConfig>(key.name, "json");
      if (config) {
        configs.push(config);
      }
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  return configs;
}

function parsePartsFromSheets(response: SheetsResponse): LegalPart[] {
  const rows = response.sheets?.[0]?.data?.[0]?.rowData;
  if (!rows) {
    return [];
  }

  const parts: LegalPart[] = [];

  // Skip the header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const values = row.values;
    if (!values) continue;

    // Column A (index 0) = row number (ignored)
    // Column B (index 1) = Name (with hyperlink)
    // Column C (index 2) = SKU
    const nameCell = values[1];
    const skuCell = values[2];

    const name = nameCell?.formattedValue?.trim();
    const sku = skuCell?.formattedValue?.trim();

    if (!name || !sku) continue;

    parts.push({
      name,
      sku,
      url: nameCell.hyperlink ?? null,
    });
  }

  return parts;
}

async function fetchPartsForConfig(
  env: Env,
  config: PartsConfig,
  apiKey: string,
): Promise<void> {
  const { spreadsheetId, sheetName, program, season } = config;

  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${
      encodeURIComponent(spreadsheetId)
    }`,
  );
  url.searchParams.set("ranges", sheetName);
  url.searchParams.set(
    "fields",
    "sheets.data.rowData.values(formattedValue,hyperlink)",
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const text = await response.text();
    console.error(
      `Google Sheets API error for ${program} ${season}: ${response.status} ${response.statusText}`,
      text,
    );
    return;
  }

  const data: SheetsResponse = await response.json();
  const parts = parsePartsFromSheets(data);

  if (parts.length < 1) {
    return;
  }

  const partsList: LegalPartsList = {
    program,
    season,
    parts,
    lastUpdated: new Date().toISOString(),
  };

  await env.parts.put(kvKey(program, season), JSON.stringify(partsList));

  console.log(
    `Stored ${parts.length} legal parts for ${program} ${season} in KV.`,
  );
}

export async function fetchLegalParts(env: Env): Promise<void> {
  const configs = await getConfigs(env);
  if (configs.length === 0) {
    return;
  }

  const apiKey = await env.GOOGLE_SHEETS_API_KEY.get();

  for (const config of configs) {
    await fetchPartsForConfig(env, config, apiKey);
  }
}
