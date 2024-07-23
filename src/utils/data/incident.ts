import { get, getMany, set, setMany, updateMany } from "~utils/data/keyval";
import { v1 as uuid } from "uuid";
import { Rule } from "~hooks/rules";
import { MatchData } from "robotevents/out/endpoints/matches";
import { TeamData } from "robotevents/out/endpoints/teams";
import { getPeer } from "./share";
import {
  IncidentMatch,
  IncidentMatchSkills,
  IncidentOutcome,
  Incident,
  WebSocketSender,
  EditIncident,
  INCIDENT_IGNORE,
  BaseIncident,
} from "@referee-fyi/share";
import { initLWW, isKeyLWW, updateLWW } from "@referee-fyi/consistency";

export type { IncidentOutcome, Incident };

export type RichIncidentElements = {
  time: Date;

  event: string;

  match?: MatchData | null;
  skills?: IncidentMatchSkills;
  team?: TeamData | null;

  outcome: IncidentOutcome;
  rules: Rule[];
  notes: string;
};

export type RichIncident = Omit<NewIncident, keyof RichIncidentElements> &
  RichIncidentElements;

export function packIncident(incident: RichIncident): NewIncident {
  return {
    ...incident,
    match: incident.match
      ? {
          type: "match",
          division: incident.match.division.id,
          id: incident.match.id,
          name: incident.match.name,
        }
      : incident.skills,
    team: incident.team!.number,
    rules: incident.rules.map((rule) => rule.rule),
  };
}

export function userString(user?: WebSocketSender) {
  if (!user) {
    return null;
  }

  switch (user.type) {
    case "server": {
      return "Server";
    }
    case "client": {
      return user.name;
    }
  }
}

export function generateIncidentId(): string {
  return `incident_${uuid()}`;
}

export async function initIncidentStore() {
  // All incidents
  const incidents = await get<Set<string>>("incidents");
  if (!incidents) {
    await set("incidents", new Set<string>());
  }
}

export async function getIncident(id: string): Promise<Incident | undefined> {
  const value = await get<Incident>(id);

  if (!value) {
    return undefined;
  }

  return {
    ...value,
    id,
  };
}

export async function getManyIncidents(
  ids: string[]
): Promise<(Incident | undefined)[]> {
  return getMany<Incident>(ids);
}

export type IncidentIndices = {
  event: Set<string>;
  team: Set<string>;
};

export async function getIncidentIndices(
  incident: Incident
): Promise<IncidentIndices> {
  const [event, team] = await getMany<Set<string> | undefined>([
    `event_${incident.event}_idx`,
    `team_${incident.team}_idx`,
  ]);

  return { event: event ?? new Set(), team: team ?? new Set() };
}

export async function setIncidentIndices(
  incident: Incident,
  indices: IncidentIndices
) {
  return setMany([
    [`event_${incident.event}_idx`, indices.event],
    [`team_${incident.team}_idx`, indices.team],
  ]);
}

export async function getIncidentsForEvent(sku: string) {
  return get<Set<string>>(`event_${sku}_idx`).then(
    (idx) => idx ?? new Set<string>()
  );
}

export async function getIncidentsForTeam(team: string) {
  return get<Set<string>>(`team_${team}_idx`).then(
    (idx) => idx ?? new Set<string>()
  );
}

/**
 * Inserts values into many indices in a single operation
 * @param indices Record<Index Name, IDs to insert into that index>
 * @return Promise<void> that resolves after transaction completes
 */
export async function bulkIndexInsert(indices: Record<string, Incident[]>) {
  await updateMany<Set<string>>(Object.keys(indices), (entries) =>
    entries.map(([key, current]) => {
      const add = new Set<string>(
        indices[key as keyof typeof indices].map((i) => i.id)
      );
      const value = current?.union(add) ?? add;
      return [key, value];
    })
  );
}

/**
 * Removes values from many indices in a single operation
 * @param indices Record<Index Name, IDs to remove from that Index>
 * @return Promise<void> that resolves after transaction completes
 */
export async function bulkIndexRemove(indices: Record<string, Incident[]>) {
  await updateMany<Set<string>>(Object.keys(indices), (entries) =>
    entries.map(([key, current]) => {
      const remove = new Set<string>(
        indices[key as keyof typeof indices].map((i) => i.id)
      );
      const value = current?.difference(remove) ?? new Set();
      return [key, value];
    })
  );
}

export async function getDeletedIncidentIndices(
  incident: Incident
): Promise<IncidentIndices> {
  const [event, team] = await getMany<Set<string> | undefined>([
    `deleted_event_${incident.event}_idx`,
    `deleted_team_${incident.team}_idx`,
  ]);

  return { event: event ?? new Set(), team: team ?? new Set() };
}

export async function setDeletedIncidentIndices(
  incident: Incident,
  indices: IncidentIndices
) {
  return setMany([
    [`deleted_event_${incident.event}_idx`, indices.event],
    [`deleted_team_${incident.team}_idx`, indices.team],
  ]);
}

export async function getDeletedIncidentsForEvent(sku: string) {
  return get<Set<string>>(`deleted_event_${sku}_idx`).then(
    (idx) => idx ?? new Set<string>()
  );
}

export async function getDeletedIncidentsForTeam(team: string) {
  return get<Set<string>>(`deleted_team_${team}_idx`).then(
    (idx) => idx ?? new Set<string>()
  );
}

export async function repairIndices(id: string, incident: Incident) {
  const { event, team } = await getIncidentIndices(incident);

  let dirty = false;

  if (!event.has(id)) {
    event.add(id);
    dirty = true;
  }

  if (!team.has(id)) {
    team.add(id);
    dirty = true;
  }

  if (dirty) {
    return setIncidentIndices(incident, { event, team });
  }
}

export async function hasIncident(id: string): Promise<boolean> {
  const incident = await get<Incident>(id);

  if (!incident) {
    return false;
  }

  return true;
}

export async function hasManyIncidents(ids: string[]): Promise<boolean[]> {
  const incidents = await getMany<Incident>(ids);
  return incidents.map((i) => !!i);
}

export async function setIncident(
  id: string,
  incident: Incident
): Promise<void> {
  return set(id, incident);
}

export async function setManyIncidents(incidents: Incident[]) {
  return setMany(incidents.map((incident) => [incident.id, incident]));
}

export type NewIncident = Omit<BaseIncident, "id">;

export async function newIncident(
  data: NewIncident,
  peer: string,
  id = generateIncidentId()
): Promise<Incident> {
  const incident: Incident = initLWW({
    value: { ...data, id },
    ignore: INCIDENT_IGNORE,
    peer,
  });
  await setIncident(id, incident);

  // Index Properly
  await bulkIndexInsert({
    [`event_${incident.event}_idx`]: [incident],
    [`team_${incident.team}_idx`]: [incident],
    ["incidents"]: [incident],
  });

  return incident;
}

export async function newManyIncidents(incidents: Incident[]) {
  await setManyIncidents(incidents);

  const eventIndices = Object.groupBy(incidents, (i) => `event_${i.event}_idx`);
  const teamIndices = Object.groupBy(incidents, (i) => `team_${i.team}_idx`);

  await bulkIndexInsert({ ...eventIndices, ...teamIndices, incidents });
}

export async function editIncident(id: string, incident: EditIncident) {
  const current = await getIncident(id);

  if (!current) {
    return;
  }

  const peer = await getPeer();
  let updated: Incident = current;
  for (const [key, currentValue] of Object.entries(current)) {
    if (!isKeyLWW(key, INCIDENT_IGNORE)) continue;

    const newValue = incident[key as keyof EditIncident];

    if (JSON.stringify(currentValue) != JSON.stringify(newValue)) {
      updated = updateLWW(updated, {
        key: key as keyof EditIncident,
        value: newValue,
        peer,
      });
    }
  }

  await setIncident(id, updated);
  return updated;
}

export async function deleteIncident(id: string): Promise<void> {
  const incident = await getIncident(id);

  if (!incident) {
    return;
  }

  await bulkIndexRemove({
    [`event_${incident.event}_idx`]: [incident],
    [`team_${incident.team}_idx`]: [incident],
  });

  await bulkIndexInsert({
    [`deleted_event_${incident.event}_idx`]: [incident],
    [`deleted_team_${incident.team}_idx`]: [incident],
  });
}

export async function deleteManyIncidents(ids: string[]) {
  const incidents = (await getManyIncidents(ids)).filter((i) => !!i);

  if (incidents.length < 1) {
    return;
  }

  const eventIndices = Object.groupBy(incidents, (i) => `event_${i.event}_idx`);
  const teamIndices = Object.groupBy(incidents, (i) => `team_${i.team}_idx`);

  await bulkIndexRemove({ ...eventIndices, ...teamIndices });

  const deletedEventIndices = Object.groupBy(
    incidents,
    (i) => `deleted_event_${i.event}_idx`
  );
  const deletedTeamIndices = Object.groupBy(
    incidents,
    (i) => `deleted_team_${i.team}_idx`
  );

  await bulkIndexInsert({ ...deletedEventIndices, ...deletedTeamIndices });
}

export async function getAllIncidents(): Promise<Incident[]> {
  const ids = await get<Set<string>>(`incidents`);
  if (!ids) return [];
  const incidents = await getManyIncidents([...ids]);

  return incidents.filter((i) => !!i) as Incident[];
}

export async function getIncidentsByEvent(event: string): Promise<Incident[]> {
  const ids = await get<Set<string>>(`event_${event}_idx`);
  if (!ids) return [];
  const incidents = await getManyIncidents([...ids]);

  return incidents.filter((i) => !!i) as Incident[];
}

export async function getIncidentsByTeam(team: string): Promise<Incident[]> {
  const ids = await get<Set<string>>(`team_${team}_idx`);
  if (!ids) return [];
  const incidents = await getManyIncidents([...ids]);

  return incidents.filter((i) => !!i) as Incident[];
}

export function matchToString(match: IncidentMatch) {
  switch (match.type) {
    case "match": {
      return match.name;
    }
    case "skills": {
      const display: Record<typeof match.skillsType, string> = {
        programming: "Auto",
        driver: "Driver",
      };
      return `${display[match.skillsType]} Skills ${match.attempt}`;
    }
  }
}
