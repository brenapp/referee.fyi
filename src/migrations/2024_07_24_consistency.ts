import {
  initLWW,
  updateLWW,
  WithLWWConsistency,
} from "@referee-fyi/consistency";
import { type NewIncident as OldIncident } from "./2024_05_07_matchSkills";
import { queueMigration } from "./utils";
import { getAllIncidents, setManyIncidents } from "~utils/data/incident";
import { getPeer } from "~utils/data/share";

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

export type BaseIncident = {
  id: string;

  time: Date;

  event: string; // SKU

  match?: IncidentMatch;
  team: string; // team number

  outcome: IncidentOutcome;
  rules: string[];
  notes: string;
};

export const INCIDENT_IGNORE = ["id", "time", "event", "team"] as const;
export type IncidentUnchangeableProperties = (typeof INCIDENT_IGNORE)[number];

export type Incident = WithLWWConsistency<
  BaseIncident,
  IncidentUnchangeableProperties
>;

function hasIncidentBeenMigrated(
  value: Incident | OldIncident
): value is Incident {
  return "consistency" in value;
}

queueMigration({
  name: `2024_07_24_consistency`,
  run_order: 1,
  dependencies: ["2024_05_07_matchSkills"],
  apply: async () => {
    const incidents = (await getAllIncidents()) as (OldIncident | Incident)[];

    const peer = await getPeer();
    const output: Incident[] = [];
    for (const incident of incidents) {
      if (hasIncidentBeenMigrated(incident)) {
        continue;
      }

      if (!incident.match) {
        incident.match = undefined;
      }

      let consistentIncident: Incident = initLWW({
        value: incident,
        ignore: INCIDENT_IGNORE,
        peer:
          incident.revision?.user.type === "client"
            ? incident.revision?.user.id
            : peer,
      });

      const history = incident?.revision?.history ?? [];
      for (const entry of history) {
        for (const change of entry.changes) {
          if (!consistentIncident.consistency[change.property]) continue;
          consistentIncident = updateLWW(consistentIncident, {
            key: change.property,
            value: change.new,
            // @ts-expect-error WebSocketSender id => key
            peer: entry.user.key ?? entry.user.id ?? peer,
            instant: new Date(entry.date).toISOString(),
          });
        }
      }

      const newIncident: Incident = {
        ...incident,
        consistency: consistentIncident.consistency,
      };
      output.push(newIncident);
    }

    await setManyIncidents(output);

    return { success: true, details: `Migrated ${output.length} incidents` };
  },
});
