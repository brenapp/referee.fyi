import { Match } from "robotevents";
import { useEvent } from "~utils/hooks/robotevents";
import { twMerge } from "tailwind-merge";
import { IdInfo } from "robotevents";

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
        props.className
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
      <p
        className={twMerge("font-mono text-xl")}
        aria-label={`${color} score ${score}`}
      >
        {score}
      </p>
    </div>
  );
};

export type MatchContextProps = {
  match: Match;
  allianceClassName?: string;
} & React.HTMLProps<HTMLDivElement>;

export const MatchContext: React.FC<MatchContextProps> = ({
  match,
  allianceClassName,
  ...props
}) => {
  const { data: event } = useEvent(match.event.code);

  if (!event) return null;

  if (event.program.code === "VIQRC") {
    const teams = match.teams();

    return (
      <div {...props} aria-label={match.name}>
        <AllianceList
          teams={teams}
          color="blue"
          score={match.alliances[0].score}
          className={allianceClassName}
        />
      </div>
    );
  }

  const red = match.alliance("red");
  const blue = match.alliance("blue");

  return (
    <div {...props} className={twMerge("flex gap-2", props.className)}>
      <AllianceList
        teams={red.teams.map((t) => t.team!)}
        color="red"
        className={allianceClassName}
        score={red.score}
      />
      <AllianceList
        teams={blue.teams.map((t) => t.team!)}
        color="blue"
        reverse
        className={allianceClassName}
        score={blue.score}
      />
    </div>
  );
};
