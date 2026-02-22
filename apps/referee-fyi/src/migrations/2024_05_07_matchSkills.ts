import type { WebSocketSender } from "@referee-fyi/share";
import { getAllIncidents } from "~utils/data/incident";
import { setMany } from "~utils/data/keyval";
import { queueMigration } from "./utils";

type IncidentOutcome = "Minor" | "Major" | "Disabled" | "General";

type IncidentMatchHeadToHead = {
	type: "match";
	division: number;
	name: string;
	id: number;
};

type IncidentMatchSkills = {
	type: "skills";
	skillsType: "driver" | "programming";
	attempt: number;
};

type IncidentMatch = IncidentMatchHeadToHead | IncidentMatchSkills;

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

	revision?: Revision<
		NewIncident,
		"event" | "id" | "team" | "revision" | "time"
	>;

	outcome: IncidentOutcome;
	rules: string[];
	notes: string;
};

export type NewIncident = {
	id: string;

	time: Date;

	event: string; // SKU

	match?: IncidentMatch;
	team: string; // team number

	outcome: IncidentOutcome;
	rules: string[];
	notes: string;

	revision?: Revision<
		NewIncident,
		"event" | "id" | "team" | "revision" | "time"
	>;
};

export type ChangeMap<T, U extends keyof T> = {
	[K in keyof Omit<T, U>]-?: {
		property: K;
		old: T[K];
		new: T[K];
	};
};

export type Change<T, U extends keyof T> = ChangeMap<T, U>[keyof ChangeMap<
	T,
	U
>];

export type ChangeLog<T, U extends keyof T> = {
	user: WebSocketSender;
	date: Date;
	changes: Change<T, U>[];
};

export type Revision<T, U extends keyof T> = {
	user: WebSocketSender;
	count: number;
	history: ChangeLog<T, U>[];
};

function hasIncidentBeenMigrated(
	incident: OldIncident | NewIncident,
): incident is NewIncident {
	return !Object.hasOwn(incident, "division");
}

queueMigration({
	name: `2024_05_07_matchSkills`,
	run_order: 0,
	dependencies: [],
	apply: async () => {
		const incidents = (await getAllIncidents()) as unknown as (
			| NewIncident
			| OldIncident
		)[];

		const migrated: [string, NewIncident][] = incidents.map((incident) => {
			if (hasIncidentBeenMigrated(incident)) {
				return [incident.id, incident];
			}

			if (!incident.match) {
				const output: NewIncident = {
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
