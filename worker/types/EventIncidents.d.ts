import { WithRevision } from "./revision";

export type UnchangeableProperties = "revision" | "event" | "team";
export type IncidentOutcome = "Minor" | "Major" | "Disabled" | "General";

export type IncidentMatchHeadToHead = {
  type: "match";
  division: number;
  name: string;
  id: number;
};

export type IncidentMatchSkills = {
  type: "skills";
  skillsType: "driver" | "programming";
  attempt: number;
};

export type IncidentMatch = IncidentMatchHeadToHead | IncidentMatchSkills;

export type Incident = WithRevision<
  {
    id: string;

    time: Date;

    event: string; // SKU

    match?: IncidentMatch;
    team: string; // team number

    outcome: IncidentOutcome;
    rules: string[];
    notes: string;
  },
  UnchangeableProperties
>;

type EditIncident = Omit<Incident, UnchangeableProperties>;

export type ShareUser = {
  id: string;
  name: string;
};

export type EventIncidentsData = {
  sku: string;
  incidents: Incident[];
  deleted: string[];
};

export type EventIncidentsInitData = {
  sku: string;
  instance: string;
};
