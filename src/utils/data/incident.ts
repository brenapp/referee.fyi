import {
  get,
  getMany,
  set,
  setMany,
  update,
  updateMany,
} from "~utils/data/keyval";
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

export type Incident = ServerIncident;
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

export type RichIncident = Omit<Incident, keyof RichIncidentElements | "id"> &
  RichIncidentElements;

export function packIncident(incident: RichIncident): Omit<Incident, "id"> {
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

export type UpdateIncidentIndices = {
  [I in keyof IncidentIndices]: (
    old: IncidentIndices[I] | undefined
  ) => IncidentIndices[I];
};

export async function updateIncidentIndices(
  incident: Incident,
  updater: UpdateIncidentIndices
) {
  return updateMany<IncidentIndices[keyof IncidentIndices]>(
    [`event_${incident.event}_idx`, `team_${incident.team}_idx`],
    ([event, team]) => [
      [event[0], updater.event(event[1])],
      [team[0], updater.team(team[1])],
    ]
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

export async function updateDeletedIncidentIndices(
  incident: Incident,
  updater: UpdateIncidentIndices
) {
  return updateMany<IncidentIndices[keyof IncidentIndices]>(
    [
      `deleted_event_${incident.event}_idx`,
      `deleted_team_${incident.team}_idx`,
    ],
    ([event, team]) => [
      [event[0], updater.event(event[1])],
      [team[0], updater.team(team[1])],
    ]
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

export async function newIncident(
  data: Omit<Incident, "id">,
  updateRemote: boolean = true,
  id = generateIncidentId()
): Promise<string> {
  const incident = { ...data, id };
  await setIncident(id, incident);

  // Index Properly
  await updateIncidentIndices(incident, {
    event: (old) => old?.add(id) ?? new Set([id]),
    team: (old) => old?.add(id) ?? new Set([id]),
  });

  await update<Set<string>>(
    "incidents",
    (old) => old?.add(id) ?? new Set([id])
  );

  const invitation = await getEventInvitation(incident.event);
  if (updateRemote && invitation && invitation.accepted) {
    useShareConnection.getState().addIncident(incident);
  }

  return id;
}

export async function newManyIncidents(incidents: Incident[]) {
  await setManyIncidents(incidents);
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

  if (!updateRemote) {
    return;
  }

  const invitation = await getEventInvitation(current.event);
  if (invitation && invitation.accepted) {
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

  await updateIncidentIndices(incident, {
    event: (old) => {
      old?.delete(id);
      return old ?? new Set();
    },
    team: (old) => {
      old?.delete(id);
      return old ?? new Set();
    },
  });

  await updateDeletedIncidentIndices(incident, {
    event: (old) => old?.add(id) ?? new Set([id]),
    team: (old) => old?.add(id) ?? new Set([id]),
  });

  const invitation = await getEventInvitation(incident.event);
  if (updateRemote && invitation && invitation.accepted) {
    useShareConnection.getState().deleteIncident(id, incident.event);
  }
}

export async function deleteManyIncidents(ids: string[]) {
  const incidents = (await getManyIncidents(ids)).filter((i) => !!i);

  if (incidents.length < 1) {
    return;
  }

  const eventIndices = Object.groupBy(incidents, (i) => `event_${i.event}_idx`);
  const teamIndices = Object.groupBy(incidents, (i) => `team_${i.team}_idx`);

  const indices: Record<string, Incident[]> = {
    ...eventIndices,
    ...teamIndices,
  };

  await updateMany<Set<string>>(Object.keys(indices), (entries) =>
    entries.map(([key, current]) => {
      const remove = new Set(
        indices[key as keyof typeof indices].map((v) => v.id)
      );
      const value = current?.difference(remove) ?? new Set();
      return [key, value];
    })
  );

  const deletedEventIndices = Object.groupBy(
    incidents,
    (i) => `deleted_event_${i.event}_idx`
  );
  const deletedTeamIndices = Object.groupBy(
    incidents,
    (i) => `deleted_team_${i.team}_idx`
  );

  const deletedIndices: Record<string, Incident[]> = {
    ...deletedEventIndices,
    ...deletedTeamIndices,
  };
  await updateMany<Set<string>>(Object.keys(deletedIndices), (entries) =>
    entries.map(([key, value]) => {
      const add = new Set<string>(
        deletedIndices[key as keyof typeof deletedIndices].map((v) => v.id)
      );
      return [key, value?.union(add) ?? add];
    })
  );
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
