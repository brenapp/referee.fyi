import { useId } from "react";
import { Match } from "robotevents/out/endpoints/matches";
import { MatchContext } from "./Context";
import { Button, ButtonMode } from "./Button";

const dateFormatter = new Intl.DateTimeFormat(navigator.language, {
  hour: "numeric",
  minute: "numeric",
});

function matchTime(match: Match) {
  if (match.started) {
    return <span>{dateFormatter.format(new Date(match.started))}</span>;
  }

  return (
    <span className="italic">
      {dateFormatter.format(new Date(match.scheduled))}
    </span>
  );
}

export type ClickableMatch = {
  match: Match;
  onClick: React.EventHandler<React.MouseEvent<HTMLButtonElement>>;
};

export const ClickableMatch: React.FC<ClickableMatch> = ({
  match,
  onClick,
}) => {
  const id = useId();
  return (
    <li
      key={match.id}
      className="flex items-center gap-4 mt-4 h-12 text-zinc-50"
    >
      <Button
        mode={ButtonMode.None}
        data-matchid={match.id}
        onClick={onClick}
        className="flex-1"
        id={id}
      >
        <p>{match.name}</p>
        <p className="text-sm">{matchTime(match)}</p>
      </Button>
      <label htmlFor={id}>
        <MatchContext match={match} />
      </label>
    </li>
  );
};
