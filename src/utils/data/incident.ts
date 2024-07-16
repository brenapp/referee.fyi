import { get, getMany, set, setMany } from "~utils/data/keyval";
import { v1 as uuid } from "uuid";
import { Rule } from "~hooks/rules";
import { MatchData } from "robotevents/out/endpoints/matches";
import { TeamData } from "robotevents/out/endpoints/teams";
import { getEventInvitation, getSender } from "./share";
import {
  EditIncident,
  IncidentMatch,
  IncidentMatchSkills,
  IncidentOutcome,
  Incident as ServerIncident,
  UnchangeableProperties,
} from "~share/api";
import { Change } from "~share/revision";
import { useShareConnection } from "~models/ShareConnection";

export type Incident = Omit<ServerIncident, "id">;
export type IncidentWithID = ServerIncident;
export type { IncidentOutcome };

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

export type RichIncident = Omit<Incident, keyof RichIncidentElements> &
  RichIncidentElements;

export function packIncident(incident: RichIncident): Incident {
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

export function generateIncidentId(): string {
  return `incident_${uuid()}`;
}

export async function initIncidentStore() {
  // All incidents
  const incidents = await get<string[]>("incidents");
  if (!incidents) {
    await set("incidents", []);
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

export async function getManyIncidents(
  ids: string[]
): Promise<(IncidentWithID | undefined)[]> {
  return (await getMany<Incident>(ids)).map((v, i) =>
    v ? { id: ids[i], ...v } : undefined
  );
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

export async function setIncident(
  id: string,
  incident: Incident
): Promise<void> {
  return set(id, incident);
}

export async function newIncident(
  incident: Incident,
  updateRemote: boolean = true,
  id = generateIncidentId()
): Promise<string> {
  await setIncident(id, incident);

  // Index Properly
  const { event, team } = await getIncidentIndices(incident);

  event.add(id);
  team.add(id);

  setIncidentIndices(incident, {
    event,
    team,
  });

  const all = (await get<string[]>("incidents")) ?? [];
  await set("incidents", [...all, id]);

  const invitation = await getEventInvitation(incident.event);
  if (updateRemote && invitation && invitation.accepted) {
    useShareConnection.getState().addIncident({ id, ...incident });
  }

  return id;
}

export async function editIncident(
  id: string,
  incident: EditIncident,
  updateRemote: boolean = true
) {
  const current = await getIncident(id);

  if (!current) {
    return;
  }

  // Annoying type coercion to support the strongly typed revision array
  const changes: Change<Incident, UnchangeableProperties>[] = [];
  for (const [key, currentValue] of Object.entries(current)) {
    if (key === "revision" || key === "team" || key === "event") continue;

    const newValue = incident[key as keyof EditIncident];

    if (JSON.stringify(currentValue) != JSON.stringify(newValue)) {
      changes.push({
        property: key,
        old: currentValue,
        new: newValue,
      } as Change<Incident, UnchangeableProperties>);
    }
  }

  const user = await getSender();

  const revision = current.revision ?? {
    count: 0,
    user,
    history: [],
  };

  revision.count += 1;
  revision.history.push({
    user,
    date: new Date(),
    changes,
  });

  const updatedIncident = { ...current, ...incident, revision };
  await setIncident(id, updatedIncident);

  const invitation = await getEventInvitation(current.event);
  if (updateRemote && invitation && invitation.accepted) {
    useShareConnection.getState().editIncident(updatedIncident);
  }
}

export async function deleteIncident(
  id: string,
  updateRemote: boolean = true
): Promise<void> {
  const incident = await getIncident(id);

  if (!incident) {
    return;
  }

  const { team, event } = await getIncidentIndices(incident);

  team.delete(id);
  event.delete(id);

  await setIncidentIndices(incident, {
    event,
    team,
  });

  const { event: deletedEvent, team: deletedTeam } =
    await getDeletedIncidentIndices(incident);

  deletedEvent.add(id);
  deletedTeam.add(id);

  await setDeletedIncidentIndices(incident, {
    event: deletedEvent,
    team: deletedTeam,
  });

  const invitation = await getEventInvitation(incident.event);
  if (updateRemote && invitation && invitation.accepted) {
    useShareConnection.getState().deleteIncident(id, incident.event);
  }
}

export async function getAllIncidents(): Promise<IncidentWithID[]> {
  const ids = await get<Set<string>>(`incidents`);
  if (!ids) return [];
  const incidents = await getManyIncidents([...ids]);

  return incidents.filter((i) => !!i) as IncidentWithID[];
}

export async function getIncidentsByEvent(
  event: string
): Promise<IncidentWithID[]> {
  const ids = await get<Set<string>>(`event_${event}_idx`);
  if (!ids) return [];
  const incidents = await getManyIncidents([...ids]);

  return incidents.filter((i) => !!i) as IncidentWithID[];
}

export async function getIncidentsByTeam(
  team: string
): Promise<IncidentWithID[]> {
  const ids = await get<Set<string>>(`team_${team}_idx`);
  if (!ids) return [];
  const incidents = await getManyIncidents([...ids]);

  return incidents.filter((i) => !!i) as IncidentWithID[];
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
