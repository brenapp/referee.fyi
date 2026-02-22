import {
	ArrowLeftIcon,
	ArrowRightIcon,
	FlagIcon,
} from "@heroicons/react/20/solid";
import { ArrowsPointingOutIcon } from "@heroicons/react/24/outline";
import { animate, type PanInfo, useMotionValue } from "motion/react";
import * as m from "motion/react-m";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Match } from "robotevents";
import { twMerge } from "tailwind-merge";
import useResizeObserver from "use-resize-observer";
import { Button, type ButtonProps, IconButton } from "~components/Button";
import { MatchContext } from "~components/Context";
import { Details, Summary } from "~components/Details";
import {
	Dialog,
	DialogBody,
	DialogCloseButton,
	DialogCustomHeader,
} from "~components/Dialog";
import { Incident } from "~components/Incident";
import { MatchTime } from "~components/Match";
import { RulesSummary } from "~components/RulesSummary";
import { Spinner } from "~components/Spinner";
import { MatchScratchpad } from "~components/scratchpad/Scratchpad";
import { useEventMatches } from "~hooks/robotevents";
import { useCurrentDivision, useCurrentEvent } from "~hooks/state";
import type {
	Incident as IncidentData,
	RichIncident,
} from "~utils/data/incident";
import { useNewIncidentDialogState } from "~utils/dialogs/new";
import { useTeamIncidentsByMatch } from "~utils/hooks/incident";
import { EventNewIncidentDialog } from "./new";
import { TeamIsolationDialog } from "./team";

function shouldDisplayIncidentInTeamSummary(incident: IncidentData) {
	if (incident.outcome === "General") {
		return false;
	}

	if (incident.match?.type === "skills") {
		return false;
	}

	const isAuto =
		incident.match?.period === "auto" || incident.match?.period === "isolation";

	if (isAuto && incident.outcome !== "Major") {
		return false;
	}

	return true;
}

type TeamSummaryProps = {
	number: string;
	match: Match;
	incidents: IncidentData[];
};

const TeamSummary: React.FC<TeamSummaryProps> = ({
	number,
	match,
	incidents,
}) => {
	const [open, setOpen] = useState(false);
	const [isolationOpen, setIsolationOpen] = useState(false);

	const teamAlliance = match.alliances.find((alliance) =>
		alliance.teams.some((t) => t.team?.name === number),
	);

	const hasGeneral = useMemo(() => {
		return incidents.some((incident) => incident.outcome === "General");
	}, [incidents]);

	return (
		<Details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
			<Summary className="flex gap-2 items-center active:bg-zinc-700 max-w-full mt-0 sticky top-0 bg-zinc-900 h-16 z-10">
				<div
					className={twMerge(
						"py-1 px-2 rounded-md font-mono flex-shrink-0",
						teamAlliance?.color === "red" ? "text-red-400" : "text-blue-400",
					)}
				>
					<p>
						{number}
						<span className="text-zinc-300">{hasGeneral ? "*" : ""}</span>
					</p>
				</div>
				<RulesSummary
					incidents={incidents}
					filter={shouldDisplayIncidentInTeamSummary}
				/>
				<TeamFlagButton match={match} team={number} />
			</Summary>
			{/* For performance - don't render Incidents unless the dialog is open */}
			{open ? (
				<>
					{incidents.map((incident) => (
						<Incident
							className="max-h-20 overflow-hidden"
							incident={incident}
							key={incident.id}
						/>
					))}
					{incidents.length > 0 ? (
						<>
							<TeamIsolationDialog
								key={number}
								team={number}
								open={isolationOpen}
								setOpen={setIsolationOpen}
							/>
							<Button
								mode="normal"
								className="flex gap-2 items-center mt-2 justify-center h-12"
								onClick={() => setIsolationOpen(true)}
							>
								<ArrowsPointingOutIcon height={20} />
								<p>Isolate Team</p>
							</Button>
						</>
					) : null}
				</>
			) : null}
		</Details>
	);
};

export type TeamFlagButtonProps = {
	match?: Match;
	team: string;
} & ButtonProps;

export const TeamFlagButton: React.FC<TeamFlagButtonProps> = ({
	match,
	team,
	...props
}) => {
	const newIncidentDialog = useNewIncidentDialogState();
	const openNewIncidentDialog = useCallback(
		(initial: Partial<RichIncident> = {}) => {
			newIncidentDialog.setOpen({
				open: true,
				initial: {
					...initial,
				},
			});
		},
		[newIncidentDialog],
	);

	return (
		<>
			<EventNewIncidentDialog state={newIncidentDialog} />
			<Button
				mode="primary"
				{...props}
				className={twMerge(
					"flex items-center w-min flex-shrink-0 my-2",
					props.className,
				)}
				onClick={() => openNewIncidentDialog({ team, match: match })}
				aria-label={`New entry for ${team}`}
			>
				<FlagIcon height={20} className="mr-2" />
				<span>New</span>
			</Button>
		</>
	);
};

type EventMatchViewProps = {
	match?: Match | null;
};
const EventMatchView: React.FC<EventMatchViewProps> = ({ match }) => {
	const { data: incidentsByTeam } = useTeamIncidentsByMatch(match, {
		initialData: () => {
			if (!match) {
				return [];
			}

			const alliances = [match.alliance("red"), match.alliance("blue")];
			const teams =
				alliances.flatMap((a) => a.teams.map((t) => t.team!.name)) ?? [];

			return teams.map((team) => ({ team, incidents: [] }));
		},
	});

	if (!match) {
		return null;
	}

	return (
		<div className="mt-4 mx-2 contents">
			{incidentsByTeam?.map(({ team: number, incidents }) => (
				<TeamSummary
					key={number}
					incidents={incidents}
					match={match}
					number={number}
				/>
			))}
			<MatchScratchpad match={match} />
		</div>
	);
};

const transition = {
	type: "spring",
	bounce: 0,
} as const;

export type EventMatchDialogProps = {
	initialMatchId: number;
	division?: number;

	open: boolean;
	setOpen: (open: boolean) => void;
};

export const EventMatchDialog: React.FC<EventMatchDialogProps> = ({
	open,
	setOpen,
	initialMatchId,
	division: defaultDivision,
}) => {
	const { data: event } = useCurrentEvent();
	const division = useCurrentDivision(defaultDivision);
	const { data: matches } = useEventMatches(event, division);

	const [[matchIndex, animateMatchTransition], setMatchIndex] = useState<
		[index: number, animate: boolean]
	>([0, false]);

	useEffect(() => {
		if (!matches) return;
		const index = matches.findIndex((match) => match.id === initialMatchId);
		if (index !== -1) {
			setMatchIndex([index, false]);
		}
	}, [initialMatchId, setMatchIndex, matches]);

	const match = useMemo(() => matches?.[matchIndex], [matchIndex, matches]);

	const hasNextMatch = matchIndex + 1 < (matches?.length ?? Infinity);
	const hasPrevMatch = matchIndex - 1 >= 0;

	const onClickNextMatch = useCallback(() => {
		if (!matches || !hasNextMatch) return;
		setMatchIndex([matchIndex + 1, true]);
	}, [hasNextMatch, matchIndex, matches]);

	const onClickPrevMatch = useCallback(() => {
		if (!matches || !hasPrevMatch) return;
		setMatchIndex([matchIndex - 1, true]);
	}, [hasPrevMatch, matchIndex, matches]);

	// Swipey Swipe Animation
	const { ref: containerRef, width: containerWidth = 0 } =
		useResizeObserver<HTMLDivElement>();

	const viewsToRender = [-1, 0, 1];
	const x = useMotionValue(0);

	const calculateNewX = useCallback(
		() => -matchIndex * containerWidth,
		[matchIndex, containerWidth],
	);

	const onDragEnd = useCallback(
		(_: Event, dragProps: PanInfo) => {
			const { offset, velocity } = dragProps;

			if (Math.abs(velocity.y) > Math.abs(velocity.x)) {
				animate(x, calculateNewX(), transition);
				return;
			}

			if (offset.x > containerWidth / 6) {
				onClickPrevMatch();
			} else if (offset.x < -containerWidth / 6) {
				onClickNextMatch();
			} else {
				animate(x, calculateNewX(), transition);
			}
		},
		[calculateNewX, containerWidth, onClickNextMatch, onClickPrevMatch, x],
	);

	useEffect(() => {
		if (!animateMatchTransition) {
			x.set(calculateNewX());
			return;
		}
		const controls = animate(x, calculateNewX(), transition);
		return controls.stop;
	}, [matchIndex, calculateNewX, x, animateMatchTransition]);

	return (
		<Dialog
			open={open}
			mode="modal"
			onClose={() => setOpen(false)}
			aria-label={`${match?.name} Dialog`}
		>
			<DialogCustomHeader>
				<DialogCloseButton onClose={() => setOpen(false)} />
				<IconButton
					icon={<ArrowLeftIcon height={24} />}
					onClick={onClickPrevMatch}
					aria-label={`Previous Match: ${matches?.[matchIndex - 1]?.name}`}
					className={twMerge(
						"bg-transparent p-2",
						hasPrevMatch ? "visible" : "invisible",
					)}
				/>
				<h1 className="text-xl flex-1">{match?.name}</h1>
				{match && <MatchTime match={match} />}
				<IconButton
					icon={<ArrowRightIcon height={24} />}
					aria-label={`Next Match: ${matches?.[matchIndex + 1]?.name}`}
					onClick={onClickNextMatch}
					className={twMerge(
						"bg-transparent p-2",
						hasNextMatch ? "visible" : "invisible",
					)}
				/>
			</DialogCustomHeader>
			<DialogBody className="relative flex flex-col">
				<Spinner show={!match} />
				{match ? (
					<MatchContext
						match={match}
						className="mb-4"
						parts={{ alliance: { className: "w-full" } }}
					/>
				) : null}
				<m.div
					ref={containerRef}
					style={{
						position: "relative",
						flexGrow: 1,
						overflow: "hidden",
					}}
				>
					{viewsToRender.map((i) => {
						const match = matches?.[matchIndex + i];
						const hiddenProps =
							i !== 0
								? {
										"aria-hidden": true,
										tabIndex: -1,
										inert: true,
									}
								: {};
						return (
							<m.div
								{...hiddenProps}
								key={matchIndex + i}
								style={{
									position: "absolute",
									width: "100%",
									height: "100%",
									x,
									left: (matchIndex + i) * containerWidth,
									right: (matchIndex + i) * containerWidth,
									overflowY: "auto",
								}}
								draggable
								drag="x"
								dragElastic={1}
								onDragEnd={onDragEnd}
							>
								<EventMatchView key={matchIndex + i} match={match} />
							</m.div>
						);
					})}
				</m.div>
			</DialogBody>
		</Dialog>
	);
};
