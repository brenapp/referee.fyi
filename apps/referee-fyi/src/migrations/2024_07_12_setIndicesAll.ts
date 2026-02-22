import { update } from "~utils/data/keyval";
import { queueMigration } from "./utils";

queueMigration({
	name: `2024_07_12_setIndicesAll`,
	run_order: 1,
	dependencies: ["2024_05_17_splitIndex"],
	apply: async () => {
		await update<Set<string> | string[]>("incidents", (old) => new Set(old));
		return { success: true };
	},
});
