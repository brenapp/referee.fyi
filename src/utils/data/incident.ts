import { get, set } from "idb-keyval";
import { v1 as uuid } from "uuid";
import { Rule } from "~hooks/rules";
import { Match } from "robotevents/out/endpoints/matches";
import { Team } from "robotevents/out/endpoints/teams";
import { ShareGetResponseData, ShareResponse } from "./share";

export enum IncidentOutcome {
  Minor,
  Major,
  Disabled,
}

export type Incident = {
  time: Date;

  event: string; // SKU
  division: number; // division ID

  match?: number; // match ID
  team?: string; // team ID

  outcome: IncidentOutcome;
  rules: string[];
  notes: string;
};

export type IncidentWithID = Incident & {
  id: string;
};

export type IncidentIndex = {
  [key: string]: string[];
};

export type RichIncident = {
  time: Date;

  event: string;
  division: number;

  match?: Match | null;
  team?: Team | null;

  outcome: IncidentOutcome;
  rules: Rule[];
  notes: string;
};

export function packIncident(incident: RichIncident): Incident {
  return {
    ...incident,
    match: incident.match?.id,
    team: incident.team?.number,
    rules: incident.rules.map((rule) => rule.rule),
  };
}

export function generateIncidentId(): string {
  return `incident_${uuid()}`;
}

export async function initIncidentStore() {
  // All incidents
  const incidents = await get<string[]>("incidents");
  if (!incidents) {
    await set("incidents", []);
  }

  // Index by event
  const eventsIndex = await get<IncidentIndex>("event_idx");
  if (!eventsIndex) {
    await set("event_idx", {});
  }

  // Index by team
  const teamsIndex = await get<IncidentIndex>("team_idx");
  if (!teamsIndex) {
    await set("team_idx", {});
  }
}

export async function getIncident(
  id: string
): Promise<IncidentWithID | undefined> {
  const value = await get<Incident>(id);

  if (!value) {
    return undefined;
  }

  return {
    ...value,
    id,
  };
}

export async function hasIncident(id: string): Promise<boolean> {
  return get(id).then((incident) => incident !== undefined);
}

export async function setIncident(
  id: string,
  incident: Incident
): Promise<void> {
  return set(id, incident);
}

export async function newIncident(incident: Incident, updateRemote: boolean = true, id = generateIncidentId()): Promise<string> {
  await setIncident(id, incident);

  // Add to all indices
  const eventsIndex = await get<IncidentIndex>("event_idx");
  const teamsIndex = await get<IncidentIndex>("team_idx");

  const eventIndex = eventsIndex?.[incident.event] ?? [];
  const teamIndex = teamsIndex?.[incident.team ?? ""] ?? [];

  await set("event_idx", {
    ...eventsIndex,
    [incident.event]: [...eventIndex, id],
  });

  await set("team_idx", {
    ...teamsIndex,
    [incident.team ?? ""]: [...teamIndex, id],
  });

  const all = (await get<string[]>("incidents")) ?? [];
  await set("incidents", [...all, id]);

  // If sharing is enabled, then submit
  const code = await get<string>(`share_${incident.event}`);
  if (code && updateRemote) {
    await fetch(`/share/add?code=${code}&sku=${incident.event}`, {
      method: "PUT",
      body: JSON.stringify({ incident: { id, ...incident } }),
    });
  }

  return id;
}

export async function deleteIncident(id: string, updateRemote: boolean = true): Promise<void> {
  const incident = await getIncident(id);

  if (!incident) {
    return;
  }

  // Remove from all indices
  const eventsIndex = await get<IncidentIndex>("event_idx");
  const teamsIndex = await get<IncidentIndex>("team_idx");

  const eventIndex = eventsIndex?.[incident.event] ?? [];
  const teamIndex = teamsIndex?.[incident.team ?? ""] ?? [];

  await set("event_idx", {
    ...eventsIndex,
    [incident.event]: eventIndex.filter((i) => i !== id),
  });

  await set("team_idx", {
    ...teamsIndex,
    [incident.team ?? ""]: teamIndex.filter((i) => i !== id),
  });

  const all = await get<string[]>("incidents");
  await set("incidents", all?.filter((i) => i !== id) ?? []);

  // If sharing is enabled, then submit
  const code = await get<string>(`share_${incident.event}`);
  if (code && updateRemote) {
    await fetch(`/share/delete?code=${code}&sku=${incident.event}&id=${id}`, {
      method: "DELETE",
    });
  }
}

export async function updateFromRemote(sku: string) {
  const code = await get<string>(`share_${sku}`);
  if (!code) return;

  const resp = await fetch(`/share/get?sku=${sku}&code=${code}`);
  if (!resp.ok) return;

  const data = await resp.json() as ShareResponse<ShareGetResponseData>;
  const incidents = new Set<string>();

  if (!data.success) { return; }

  // Update incident
  for (const { id, ...incident } of data.data.incidents) {
    const exists = await hasIncident(id);
    incidents.add(id);
    if (!exists) {
      await newIncident(incident, false, id);
    }
  }

  const eventsIndex = (await get<IncidentIndex>("event_idx"));
  const list = eventsIndex?.[sku] ?? [];

  for (const id of list) {
    if (incidents.has(id)) { continue };
    await deleteIncident(id, false);
  }
}

export async function getAllIncidents(): Promise<IncidentWithID[]> {
  const all = await get<string[]>("incidents");
  return Promise.all(
    all?.map((id) => getIncident(id) as Promise<IncidentWithID>) ?? []
  );
}

export async function getIncidentsByEvent(
  event: string
): Promise<IncidentWithID[]> {
  const eventsIndex = await get<IncidentIndex>("event_idx");
  const ids = eventsIndex?.[event] ?? [];
  return Promise.all(
    ids.map((id) => getIncident(id) as Promise<IncidentWithID>)
  );
}

export async function getIncidentsByTeam(
  team: string
): Promise<IncidentWithID[]> {
  const teamsIndex = await get<IncidentIndex>("team_idx");
  const ids = teamsIndex?.[team] ?? [];
  return Promise.all(
    ids.map((id) => getIncident(id) as Promise<IncidentWithID>)
  );
}
