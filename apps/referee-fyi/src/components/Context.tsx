import type { IdInfo, Match, ProgramAbbr } from "robotevents";
import { twMerge } from "tailwind-merge";
import { useEvent } from "~utils/hooks/robotevents";
import type { ComponentParts } from "./parts";

export type AllianceListProps = {
	teams: IdInfo[];
	color: "red" | "blue";
	reverse?: boolean;
	score?: number;
} & React.HTMLProps<HTMLDivElement>;

export const AllianceList: React.FC<AllianceListProps> = ({
	teams,
	reverse,
	color,
	score,
	...props
}) => {
	const colorClass = color === "red" ? "bg-red-400" : "bg-blue-400";

	return (
		<div
			{...props}
			className={twMerge(
				"flex items-center justify-between w-28 px-1 rounded-md",
				reverse ? "flex-row-reverse" : "",
				colorClass,
				props.className,
			)}
		>
			<ul
				className={twMerge("rounded-md font-mono w-16 h-12")}
				aria-label={`${color} Alliance - ${teams
					.map((t) => t.name)
					.join(", ")}`}
			>
				{teams.map((team) => (
					<li
						key={team.id}
						className={reverse ? "text-right" : "text-left"}
						aria-label={`${color} team ${team.name}`}
					>
						{team.name}
					</li>
				))}
			</ul>
			<p className={twMerge("font-mono text-xl")}>{score}</p>
		</div>
	);
};

export type MatchContextParts = ComponentParts<{
	alliance: Partial<AllianceListProps>;
}>;

export type MatchContextProps = {
	match: Match;
} & React.HTMLProps<HTMLDivElement> &
	MatchContextParts;

export const SingleAllianceMatchContext: React.FC<MatchContextProps> = ({
	match,
	parts,
	...props
}) => {
	const teams = match.teams();

	return (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: match context is a presentational div with descriptive label
		<div {...props} aria-label={match.name}>
			<AllianceList
				teams={teams}
				color="blue"
				score={match.alliances[0].score}
				{...parts?.alliance}
			/>
		</div>
	);
};

const SINGLE_ALLIANCE_PROGRAMS: ProgramAbbr[] = ["ADC", "VIQRC"];

export const MatchContext: React.FC<MatchContextProps> = ({
	match,
	parts,
	...props
}) => {
	const { data: event } = useEvent(match.event.code);

	if (!event) return null;

	if (SINGLE_ALLIANCE_PROGRAMS.includes(event.program?.code as ProgramAbbr)) {
		return (
			<SingleAllianceMatchContext match={match} parts={parts} {...props} />
		);
	}

	const red = match.alliance("red");
	const blue = match.alliance("blue");

	return (
		<div {...props} className={twMerge("flex gap-2", props.className)}>
			<AllianceList
				teams={red.teams.map((t) => t.team).filter((t) => !!t)}
				color="red"
				score={red.score}
				{...parts?.alliance}
			/>
			<AllianceList
				teams={blue.teams.map((t) => t.team).filter((t) => !!t)}
				color="blue"
				reverse
				score={blue.score}
				{...parts?.alliance}
			/>
		</div>
	);
};
