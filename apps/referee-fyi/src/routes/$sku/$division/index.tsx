import {
	CloudIcon as ManageIconOutline,
	ClipboardDocumentListIcon as MatchesIconOutline,
	UserGroupIcon as TeamsIconOutline,
} from "@heroicons/react/24/outline";
import {
	CloudIcon as ManageIconSolid,
	ClipboardDocumentListIcon as MatchesIconSolid,
	MicrophoneIcon,
	StopIcon,
	UserGroupIcon as TeamsIconSolid,
} from "@heroicons/react/24/solid";
import { createFileRoute } from "@tanstack/react-router";
import { m, type Variants } from "motion/react";
import { useEffect } from "react";
import { IconButton } from "~components/Button";
import { Tabs } from "~components/Tabs";
import { useCurrentEvent } from "~hooks/state";
import { useAmbientMode } from "~utils/hooks/ambient";
import { useAddEventVisited } from "~utils/hooks/history";
import { EventManageTab } from "./-tabs/manage";
import { EventMatchesTab } from "./-tabs/matches";
import { EventTeamsTab } from "./-tabs/teams";

export const AmbientInterstitial: React.FC = () => {
	const { listening, start, stop, results } = useAmbientMode();

	const variants: Variants = {
		inactive: { height: "3rem" },
		listening: { height: "3rem" },
		pending: { height: "8rem" },
	};

	const animate = listening ? "listening" : "inactive";

	const lastResult = results.length > 0 ? results[results.length - 1] : null;

	return (
		<section className="flex gap-2 rounded-md mb-4">
			<IconButton
				className="rounded-md bg-emerald-600"
				onClick={() => (listening ? stop() : start())}
				icon={
					listening ? (
						<StopIcon className="h-6 aspect-square" />
					) : (
						<MicrophoneIcon className="h-6 aspect-square" />
					)
				}
			/>
			<m.div
				className="bg-zinc-900 rounded-md flex-1"
				variants={variants}
				initial="inactive"
				animate={animate}
			>
				<nav className="h-12 mx-2 flex items-center">
					{listening ? (
						JSON.stringify(lastResult)
					) : (
						<span className="text-sm text-emerald-400 font-bold">
							Ambient Mode
						</span>
					)}
				</nav>
			</m.div>
		</section>
	);
};

export const EventHome: React.FC = () => {
	const { data: event } = useCurrentEvent();
	const { mutateAsync: addEvent, isSuccess } = useAddEventVisited();

	useEffect(() => {
		if (event && !isSuccess) {
			addEvent(event);
		}
	}, [event, isSuccess, addEvent]);

	return event ? (
		<section className="mt-4 flex flex-col">
			<AmbientInterstitial />
			<Tabs
				id={["/$sku/$division", "EventHome"]}
				className="flex-1"
				parts={{
					tablist: {
						className: "absolute bottom-0 right-0 left-0 z-10 p-0 bg-zinc-900",
					},
				}}
			>
				{[
					{
						type: "content",
						id: "matches",
						label: "Matches",
						icon: (active) =>
							active ? (
								<MatchesIconSolid height={24} className="inline" />
							) : (
								<MatchesIconOutline height={24} className="inline" />
							),
						content: <EventMatchesTab event={event} />,
					},
					{
						type: "content",
						id: "team",
						label: "Teams",
						icon: (active) =>
							active ? (
								<TeamsIconSolid height={24} className="inline" />
							) : (
								<TeamsIconOutline height={24} className="inline" />
							),
						content: <EventTeamsTab event={event} />,
					},
					{
						type: "content",
						id: "manage",
						label: "Manage",
						icon: (active) =>
							active ? (
								<ManageIconSolid height={24} className="inline" />
							) : (
								<ManageIconOutline height={24} className="inline" />
							),
						content: <EventManageTab event={event} />,
					},
				]}
			</Tabs>
		</section>
	) : null;
};

export const Route = createFileRoute("/$sku/$division/")({
	component: EventHome,
});
