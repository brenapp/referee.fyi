import { Match } from "robotevents/out/endpoints/matches";
import { useEvent } from "../utils/hooks/robotevents";
import { twMerge } from "tailwind-merge";
import { IdInfo } from "robotevents/out/endpoints";
import { HTMLProps } from "../utils/types";

export type AllianceListProps = {
  teams: IdInfo<string>[];
  color: "red" | "blue";
  reverse?: boolean;
  score?: number;
} & HTMLProps<HTMLDivElement>;

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
      className={twMerge(
        "flex items-center justify-between w-28 px-1 rounded-md",
        reverse ? "flex-row-reverse" : "",
        colorClass,
        props.className
      )}
      {...props}
    >
      <ul className={twMerge("rounded-md font-mono w-16 h-12")}>
        {teams.map((team) => (
          <li key={team.id} className={reverse ? "text-right" : "text-left"}>
            {team.name}
          </li>
        ))}
      </ul>
      <p className={twMerge("font-mono text-xl")}>{score}</p>
    </div>
  );
};

export type MatchContextProps = {
  match: Match;
} & HTMLProps<HTMLDivElement>;

export const MatchContext: React.FC<MatchContextProps> = ({
  match,
  ...props
}) => {
  const { data: event } = useEvent(match.event.code);

  if (!event) return null;

  if (event.program.code === "VIQRC") {
    const teams = match.alliances
      .map((a) => a.teams)
      .flat()
      .map((t) => t.team);

    return (
      <AllianceList
        teams={teams}
        color="blue"
        score={match.alliances[0].score}
      />
    );
  }

  const red = match.alliance("red");
  const blue = match.alliance("blue");

  return (
    <div {...props} className={twMerge("flex gap-2", props.className)}>
      <AllianceList
        teams={red.teams.map((t) => t.team)}
        color="red"
        score={red.score}
      />
      <AllianceList
        teams={blue.teams.map((t) => t.team)}
        color="blue"
        reverse
        score={blue.score}
      />
    </div>
  );
};
