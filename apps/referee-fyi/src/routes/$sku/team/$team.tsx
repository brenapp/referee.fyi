import {
	ClipboardDocumentListIcon,
	FlagIcon,
	PhotoIcon,
} from "@heroicons/react/24/solid";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import type { EventData, MatchData, TeamData } from "robotevents";
import { AssetPreview } from "~components/Assets";
import { EventMatchDialog } from "~components/dialogs/match";
import { Incident } from "~components/Incident";
import { ClickableMatch } from "~components/Match";
import { Spinner } from "~components/Spinner";
import { Tabs } from "~components/Tabs";
import { VirtualizedList } from "~components/VirtualizedList";
import { useTeamIncidentsByEvent } from "~hooks/incident";
import { useEventMatchesForTeam, useEventTeam } from "~hooks/robotevents";
import { useCurrentEvent } from "~hooks/state";
import { useEventAssetsForTeam } from "~utils/hooks/assets";

export type EventTeamAssetsProps = {
	team?: string;
	sku?: string;
};

export const EventTeamAssets: React.FC<EventTeamAssetsProps> = ({
	team,
	sku,
}) => {
	const assets = useEventAssetsForTeam(sku, team);
	return (
		<div className="grid lg:grid-cols-6 grid-cols-2 md:grid-cols-3 mt-4 gap-2 overflow-y-auto pb-24">
			{assets?.map((asset) => (asset ? <AssetPreview asset={asset} /> : null))}
		</div>
	);
};

type EventTeamsTabProps = {
	event: EventData | null | undefined;
	team: TeamData | null | undefined;
};

export const EventTeamsMatches: React.FC<EventTeamsTabProps> = ({
	event,
	team,
}) => {
	const { data: matches, isLoading } = useEventMatchesForTeam(event, team);

	const [matchId, setMatchId] = useState<number>(0);
	const [division, setDivision] = useState(1);
	const [matchDialogOpen, setMatchDialogOpen] = useState(false);

	const onClickMatch = useCallback((match: MatchData) => {
		setMatchId(match.id);
		setDivision(match.division.id);
		setTimeout(() => {
			setMatchDialogOpen(true);
		}, 0);
	}, []);

	return (
		<>
			<EventMatchDialog
				initialMatchId={matchId}
				open={matchDialogOpen}
				setOpen={setMatchDialogOpen}
				division={division}
			/>
			<Spinner show={isLoading} />
			<ul className="flex-1 overflow-y-auto pb-24">
				{matches?.map((match) => (
					<ClickableMatch
						match={match}
						key={match.id}
						onClick={() => onClickMatch(match)}
					/>
				))}
			</ul>
		</>
	);
};

export const EventTeamsIncidents: React.FC<EventTeamsTabProps> = ({
	team,
	event,
}) => {
	const {
		data: incidents,
		isLoading: isIncidentsLoading,
		isSuccess,
	} = useTeamIncidentsByEvent(team?.number, event?.sku);

	if (isSuccess && incidents.length < 1) {
		return <p className="mt-4">No Recorded Entries!</p>;
	}

	return (
		<ul className="contents">
			<Spinner show={isIncidentsLoading} />
			<VirtualizedList
				data={incidents}
				options={{ estimateSize: () => 88 }}
				className="flex-1"
				parts={{ list: { className: "mb-24" } }}
			>
				{(incident) => (
					<Incident incident={incident} key={incident.id} className="h-20" />
				)}
			</VirtualizedList>
		</ul>
	);
};

export const EventTeamsPage: React.FC = () => {
	const { team: number } = useParams({ from: "/$sku/team/$team" });
	const { data: event } = useCurrentEvent();
	const { data: team } = useEventTeam(event, number ?? "");

	const teamLocation = useMemo(() => {
		if (!team) return null;
		return [
			team?.location?.city,
			team?.location?.region,
			team?.location?.country,
		]
			.filter((v) => !!v)
			.join(", ");
	}, [team]);

	return (
		<section className="flex flex-col">
			<header>
				<h1 className="text-xl overflow-hidden whitespace-nowrap text-ellipsis max-w-[20ch] lg:max-w-prose mt-4">
					<span className="font-mono text-emerald-400">{number}</span>
					{" • "}
					<span>{team?.team_name}</span>
				</h1>
				<p className="italic">{teamLocation}</p>
			</header>
			<Tabs
				id={["/$sku/team/$team", "EventTeamsPage"]}
				parts={{
					tablist: {
						className: "absolute bottom-0 right-0 left-0 z-10 p-0 bg-zinc-900",
					},
				}}
			>
				{[
					{
						type: "content",
						id: "incidents",
						label: "Incidents",
						icon: (active) =>
							active ? (
								<FlagIcon height={24} className="inline" />
							) : (
								<FlagIcon height={24} className="inline" />
							),
						content: <EventTeamsIncidents event={event} team={team} />,
					},
					{
						type: "content",
						id: "schedule",
						label: "Schedule",
						icon: (active) =>
							active ? (
								<ClipboardDocumentListIcon height={24} className="inline" />
							) : (
								<ClipboardDocumentListIcon height={24} className="inline" />
							),
						content: <EventTeamsMatches event={event} team={team} />,
					},
					{
						type: "content",
						id: "assets",
						label: "Images",
						icon: (active) =>
							active ? (
								<PhotoIcon height={24} className="inline" />
							) : (
								<PhotoIcon height={24} className="inline" />
							),
						content: <EventTeamAssets sku={event?.sku} team={team?.number} />,
					},
				]}
			</Tabs>
		</section>
	);
};

export const Route = createFileRoute("/$sku/team/$team")({
	component: EventTeamsPage,
});
