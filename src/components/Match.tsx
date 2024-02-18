import { useEffect, useId, useMemo, useState } from "react";
import { MatchData, Round } from "robotevents/out/endpoints/matches";
import { MatchContext } from "./Context";
import { Button } from "./Button";
import { twMerge } from "tailwind-merge";

function formatTime(ms: number) {
  const seconds = Math.floor(Math.abs(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const t = [h, m > 9 ? m : h ? "0" + m : m || "0", s > 9 ? s : "0" + s]
    .filter(Boolean)
    .join(":");
  return ms < 0 && seconds ? `-${t}` : t;
}

export type MatchTimeProps = {
  match?: MatchData;
};

export const MatchTime: React.FC<MatchTimeProps> = ({ match }) => {
  const [now, setNow] = useState<number>(Date.now());

  const delta = useMemo(() => {
    if (!match?.scheduled) {
      return undefined;
    }

    const scheduled = new Date(match.scheduled).getTime();

    // upcoming matches
    if (!match.started) {
      const time = scheduled - now;
      return time;
    }

    const started = new Date(match.started).getTime();
    const time = started - scheduled;

    return time;
  }, [match, now]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (typeof delta === "undefined") {
    return null;
  }

  return (
    <span
      className={twMerge(
        "font-mono",
        delta > 0 ? "text-emerald-400" : "text-red-400"
      )}
    >
      {formatTime(delta)}
    </span>
  );
};

const dateFormatter = new Intl.DateTimeFormat(navigator.language, {
  hour: "numeric",
  minute: "numeric",
});

function matchTime(match: MatchData) {
  if (match.started) {
    return <span>{dateFormatter.format(new Date(match.started))}</span>;
  }

  return (
    <span className="italic">
      {dateFormatter.format(new Date(match.scheduled))}
    </span>
  );
}

function shortMatchName(match: MatchData) {
  switch (match.round) {
    case Round.Practice: {
      return "P " + match.matchnum;
      break;
    }
    case Round.Qualification: {
      return "Q " + match.matchnum;
    }
    case Round.RoundOf16: {
      return "R16 " + match.instance + "-" + match.matchnum;
      break;
    }
    case Round.Quarterfinals: {
      return "QF " + match.instance + "-" + match.matchnum;
      break;
    }
    case Round.Semifinals: {
      return "SF " + match.instance + "-" + match.matchnum;
      break;
    }
    case Round.Finals: {
      return "F " + match.instance + "-" + match.matchnum;
      break;
    }
  }
}

export type ClickableMatch = {
  match: MatchData;
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
        mode={"transparent"}
        data-matchid={match.id}
        onClick={onClick}
        className="flex-1 active:bg-zinc-600"
        id={id}
      >
        <p>{shortMatchName(match)}</p>
        <p className="text-sm">{matchTime(match)}</p>
      </Button>
      <label htmlFor={id}>
        <MatchContext match={match} />
      </label>
    </li>
  );
};
