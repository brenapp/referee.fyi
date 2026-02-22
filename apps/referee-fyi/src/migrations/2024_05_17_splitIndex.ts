import { getAllIncidents, repairIndices } from "~utils/data/incident";
import { queueMigration } from "./utils";

queueMigration({
	name: `2024_05_17_splitIndex`,
	run_order: 1,
	dependencies: ["2024_05_07_matchSkills"],
	apply: async () => {
		const incidents = await getAllIncidents();

		for (const incident of incidents) {
			await repairIndices(incident.id, incident);
		}

		return { success: true };
	},
});
