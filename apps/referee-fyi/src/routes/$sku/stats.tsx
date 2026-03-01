import type { IncidentOutcome } from "@referee-fyi/share";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useEventIncidents } from "~utils/hooks/incident";
import { useCurrentEvent } from "~utils/hooks/state";

const dateFormatter = new Intl.DateTimeFormat(navigator.language, {
	month: "short",
	day: "numeric",
	year: "numeric",
});

export const StatsRoute: React.FC = () => {
	const { data: event } = useCurrentEvent();
	const { data: incidents } = useEventIncidents(event?.sku);

	const incidentsByOutcome = useMemo(() => {
		const outcome: Record<IncidentOutcome, number> = {
			General: 0,
			Minor: 0,
			Major: 0,
			InspectionPassed: 0,
			InspectionFailed: 0,
			Disabled: 0,
		};

		for (const incident of incidents ?? []) {
			outcome[incident.outcome]++;
		}

		return outcome;
	}, [incidents]);

	const incidentsByRule = useMemo(() => {
		const ruleCount: Record<string, number> = {};

		for (const incident of incidents ?? []) {
			for (const rule of incident.rules) {
				if (!ruleCount[rule]) {
					ruleCount[rule] = 0;
				}
				ruleCount[rule]++;
			}
		}

		return ruleCount;
	}, [incidents]);

	const topRules = useMemo(() => {
		const sortedRules = Object.entries(incidentsByRule).sort(
			(a, b) => b[1] - a[1],
		);
		return sortedRules.slice(0, 10);
	}, [incidentsByRule]);

	const dateRange = useMemo(() => {
		if (!event || !event.start || !event.end) return null;
		const start = new Date(event.start);
		const end = new Date(event.end);

		return `${dateFormatter.format(start)}–${dateFormatter.format(end)}`;
	}, [event]);

	return (
		<main className="max-w-md h-screen mx-auto grid grid-cols-2 grid-rows-8 p-4 gap-4">
			<header className="bg-zinc-900 col-span-2 row-span-1 rounded-md p-4 flex flex-col justify-center align-middle">
				<h1 className="text-lg leading-0.5 leading-1">{event?.name}</h1>
				<h2 className="text-sm mt-1">
					<span className="font-mono text-emerald-400">{event?.sku}</span> •{" "}
					{dateRange}
				</h2>
			</header>
			<section className="text-center flex flex-col justify-center align-middle bg-zinc-900 rounded-md">
				<h3 className="text-2xl font-mono">{incidents?.length}</h3>
				<p>Incidents</p>
			</section>
			<ul className="flex flex-col gap-2 row-span-4">
				{topRules.map(([rule, count]) => (
					<li
						key={rule}
						className="p-2 px-4 bg-zinc-900 rounded-md flex items-center justify-between"
					>
						<span className="font-mono text-sm">{rule}</span>
						<span className="font-mono">{count}</span>
					</li>
				))}
			</ul>
			<ul className="flex flex-col gap-2 row-span-4">
				<li className="p-2 bg-red-500 rounded-md">
					<span className="font-mono">{incidentsByOutcome.Major}</span> Major
				</li>
				<li className="p-2 bg-yellow-500 rounded-md">
					<span className="font-mono">{incidentsByOutcome.Minor}</span> Minor
				</li>
				<li className="p-2 bg-purple-500 rounded-md">
					<span className="font-mono">{incidentsByOutcome.Disabled}</span>{" "}
					Disabled
				</li>
				<li className="p-2 bg-zinc-500 rounded-md">
					<span className="font-mono">{incidentsByOutcome.General}</span>{" "}
					General
				</li>
				<li className="p-2 bg-blue-500 rounded-md">
					<span className="font-mono">
						{incidentsByOutcome.InspectionPassed +
							incidentsByOutcome.InspectionFailed}
					</span>{" "}
					Inspection
				</li>
			</ul>
		</main>
	);
};

export const Route = createFileRoute("/$sku/stats")({
	component: StatsRoute,
});
