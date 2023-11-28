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
        "flex items-center justify-between",
        reverse ? "flex-row-reverse" : "",
        props.className
      )}
      {...props}
    >
      <ul
        className={twMerge(
          "rounded-md font-mono w-18 h-12 px-2",
          reverse
            ? "rounded-r-md rounded-l-none"
            : "rounded-l-md rounded-r-none",
          colorClass
        )}
      >
        {teams.map((team) => (
          <li key={team.id} className="text-right">
            {team.id}
          </li>
        ))}
      </ul>
      <p
        className={twMerge(
          "font-mono text-xl h-12 w-12 flex items-center justify-center px-2",
          reverse ? "rounded-l-md" : "rounded-r-md",
          colorClass
        )}
      >
        {score}
      </p>
    </div>
  );
};

export type MatchContextProps = {
  match: Match;
};

export const MatchContext: React.FC<MatchContextProps> = ({ match }) => {
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
    <div className="flex gap-2">
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
