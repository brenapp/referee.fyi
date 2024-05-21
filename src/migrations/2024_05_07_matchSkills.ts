import { getAllIncidents } from "~utils/data/incident";
import { queueMigration } from "./utils";
import {
  ChangeLog,
  IncidentOutcome,
  Incident,
  IncidentMatch,
} from "~share/EventIncidents";
import { WebSocketSender } from "~share/api";
import { setMany } from "idb-keyval";

type OldIncident = {
  id: string;

  time: Date;

  event: string; // SKU
  division: number; // division ID

  match?: {
    name: string;
    id: number;
  };
  team?: string; // team number

  revision?: {
    count: number;
    user: WebSocketSender;
    history: ChangeLog[];
  };

  outcome: IncidentOutcome;
  rules: string[];
  notes: string;
};

function hasIncidentBeenMigrated(
  incident: OldIncident | Incident
): incident is Incident {
  return !Object.hasOwn(incident, "division");
}

queueMigration({
  name: `2024_05_07_matchSkills`,
  run_order: 0,
  dependencies: [],
  apply: async () => {
    const incidents = (await getAllIncidents()) as (Incident | OldIncident)[];

    const migrated: [string, Incident][] = incidents.map((incident) => {
      if (hasIncidentBeenMigrated(incident)) {
        return [incident.id, incident];
      }

      if (!incident.match) {
        const output: Incident = {
          id: incident.id,
          event: incident.event,
          notes: incident.notes,
          outcome: incident.outcome,
          rules: incident.rules,
          time: new Date(incident.time),
          revision: incident.revision,
          team: incident.team!,
        };
        return [output.id, output];
      }

      const match: IncidentMatch = {
        type: "match",
        division: incident.division,
        ...incident.match,
      };

      const output = {
        id: incident.id,
        event: incident.event,
        notes: incident.notes,
        outcome: incident.outcome,
        rules: incident.rules,
        time: new Date(incident.time),
        revision: incident.revision,
        team: incident.team!,
        match,
      };

      return [output.id, output];
    });

    await setMany(migrated);

    return { success: true };
  },
});
