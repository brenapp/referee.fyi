import { WithLWWConsistency } from "@referee-fyi/consistency";

export const OUTCOMES = [
  "General",
  "Minor",
  "Major",
  "Inspection",
  "Disabled",
] as const;

export type IncidentOutcome = (typeof OUTCOMES)[number];

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

export type IncidentFlag = "judge";

export type BaseIncident = {
  id: string;

  time: Date;

  event: string; // SKU

  match?: IncidentMatch;
  team: string; // team number

  outcome: IncidentOutcome;
  rules: string[];
  notes: string;
  assets: string[];
  flags?: IncidentFlag[];
};

export const INCIDENT_IGNORE = ["id", "time", "event", "team"] as const;
export type IncidentUnchangeableProperties = (typeof INCIDENT_IGNORE)[number];

export type Incident = WithLWWConsistency<
  BaseIncident,
  IncidentUnchangeableProperties
>;

export type EditIncident = Omit<BaseIncident, IncidentUnchangeableProperties>;
