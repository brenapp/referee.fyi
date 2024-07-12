import { getAllIncidents } from "~utils/data/incident";
import { queueMigration } from "./utils";
import { getMany, setMany } from "idb-keyval";

queueMigration({
  name: `2024_07_11_setIndices`,
  run_order: 1,
  dependencies: ["2024_05_17_splitIndex"],
  apply: async () => {
    const processedIndices = new Set<string>();
    const incidents = await getAllIncidents();

    for (const incident of incidents) {
      const indices = [
        `event_${incident.event}_idx`,
        `team_${incident.team}_idx`,
        `deleted_event_${incident.event}_idx`,
        `deleted_team_${incident.team}_idx`,
      ];

      const unprocessed = indices.filter((t) => !processedIndices.has(t));
      const old = await getMany<Set<string> | string[]>(unprocessed);
      await setMany(old.map((v, i) => [unprocessed[i], new Set(v)]));
    }

    return { success: true };
  },
});
