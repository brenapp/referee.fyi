import type { Incident, IncidentOutcome } from "@referee-fyi/share";
import type React from "react";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";

const highlights: Record<IncidentOutcome, string> = {
	Minor: "text-yellow-300",
	Disabled: "text-blue-300",
	Major: "text-red-300",
	General: "text-zinc-300",
	Inspection: "text-zinc-300",
};

const OUTCOME_PRIORITY: IncidentOutcome[] = [
	"Major",
	"Disabled",
	"Minor",
	"General",
];

export type RulesSummaryProps = {
	incidents: Incident[];
	filter?: (incident: Incident) => boolean;
} & React.HTMLProps<HTMLUListElement>;

export const RulesSummary: React.FC<RulesSummaryProps> = ({
	incidents,
	filter,
	...props
}) => {
	const counts = useMemo(() => {
		const rules: Record<string, Incident[]> = {};

		for (const incident of incidents) {
			if (!filter?.(incident)) {
				continue;
			}

			if (incident.rules.length < 1) {
				if (rules["NA"]) {
					rules["NA"].push(incident);
				} else {
					rules["NA"] = [incident];
				}
			}

			for (const rule of incident.rules) {
				if (rules[rule]) {
					rules[rule].push(incident);
				} else {
					rules[rule] = [incident];
				}
			}
		}

		return Object.entries(rules).sort((a, b) => a[1].length - b[1].length);
	}, [filter, incidents]);

	return (
		<ul
			{...props}
			className={twMerge(
				"text-sm flex-1 flex-shrink break-normal overflow-x-hidden",
				props.className,
			)}
		>
			{counts.map(([rule, incidents]) => {
				let outcome: IncidentOutcome = "Minor";
				for (const incident of incidents) {
					if (
						OUTCOME_PRIORITY.indexOf(incident.outcome) <
						OUTCOME_PRIORITY.indexOf(outcome)
					) {
						outcome = incident.outcome;
					}
				}

				return (
					<li
						key={rule}
						className={twMerge(
							highlights[outcome],
							"text-sm font-mono inline mx-1",
						)}
					>
						{incidents.length}x{rule.replace(/[<>]/g, "")}
					</li>
				);
			})}
		</ul>
	);
};
