import { programs, seasons } from "robotevents";
import { getRecentRules, setRecentRules } from "~utils/hooks/history";
import { queueMigration } from "./utils";

queueMigration({
	name: `2025_01_12_clearSG6`,
	run_order: 1,
	dependencies: [],
	apply: async () => {
		const rules = await getRecentRules(
			programs.V5RC,
			seasons[programs.V5RC]["2024-2025"],
		);

		const filtered = rules.filter((rule) => rule.rule !== "<SG6>");
		setRecentRules(
			programs.V5RC,
			seasons[programs.V5RC]["2024-2025"],
			filtered,
		);

		return {
			success: true,
			details: `Removed <SG6> from recent rules`,
		};
	},
});
