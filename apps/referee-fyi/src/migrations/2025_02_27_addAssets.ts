import { getAllIncidents, setManyIncidents } from "~utils/data/incident";
import { queueMigration } from "./utils";
import { IncidentMatch, IncidentOutcome } from "./2024_07_24_consistency";
import type { WithLWWConsistency } from "@referee-fyi/consistency";
import { Incident as CurrentIncident } from "~utils/data/incident";
import { getShareProfile } from "~utils/data/share";

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
};

export const INCIDENT_IGNORE = ["id", "time", "event", "team"] as const;
export type IncidentUnchangeableProperties = (typeof INCIDENT_IGNORE)[number];

export type Incident = WithLWWConsistency<
  BaseIncident,
  IncidentUnchangeableProperties
>;

export type OldIncident = WithLWWConsistency<
  Omit<BaseIncident, "assets">,
  IncidentUnchangeableProperties
>;

function hasIncidentBeenMigrated(
  value: Incident | OldIncident
): value is Incident {
  return "assets" in value;
}

queueMigration({
  name: `2025_02_27_addAssets`,
  run_order: 1,
  dependencies: ["2024_07_24_consistency"],
  apply: async () => {
    const newIncidents: Incident[] = [];
    const incidents = (await getAllIncidents()) as unknown as (
      | Incident
      | OldIncident
    )[];

    const { key: peer } = await getShareProfile();

    for (const incident of incidents) {
      if (hasIncidentBeenMigrated(incident)) {
        newIncidents.push(incident);
        continue;
      }

      const oldConsistency = incident.consistency as Omit<
        Incident["consistency"],
        "assets"
      >;

      const consistency: Incident["consistency"] = {
        ...oldConsistency,
        assets: {
          count: 0,
          peer,
          instant: new Date().toISOString(),
          history: [],
        },
      };

      const newIncident: Incident = {
        ...incident,
        assets: [],
        consistency,
      };

      newIncidents.push(newIncident);
    }

    await setManyIncidents(newIncidents as unknown as CurrentIncident[]);

    return { success: true };
  },
});
