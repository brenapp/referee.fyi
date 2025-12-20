import { useCallback, useMemo, useState } from "react";
import { useEventMatches } from "~utils/hooks/robotevents";
import { useCurrentDivision } from "~utils/hooks/state";
import { EventMatchDialog } from "~components/dialogs/match";
import { Spinner } from "~components/Spinner";
import { ClickableMatch, MatchTime } from "~components/Match";
import { Button } from "~components/Button";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { VirtualizedList } from "~components/VirtualizedList";
import { DisconnectedWarning } from "~components/DisconnectedWarning";
import type { EventData, Match } from "robotevents";

export type UpcomingMatchProps = {
  event: EventData;
  onClickMatch: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

/**
 * Determines if a match has started or has a non-zero score.
 * @param match Match to check.
 * @returns True if the match has started or any alliance has a non-zero score; otherwise false.
 */
function isMatchStarted(match: Match): boolean {
  return !!match.started || match.alliances.some((a) => a.score !== 0);
}

/**
 * Computes the next upcoming match from a list of matches. RobotEvents has a
 * bug where it will incorrectly report some matches are not started when they
 * have a zero score, even if they have been played. We can work around this by
 * checking for the next match in the list as well.
 *
 * @param matches List of matches in a single division (technically fieldset)
 * @returns The first unplayed match, or null if all matches have been played
 **/
function getUpcomingMatch(matches: Match[]): Match | null {
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];

    if (isMatchStarted(match)) {
      continue;
    }

    // Look ahead to see if any subsequent matches have started
    let allLaterMatchesUnstarted = true;
    for (let j = i + 1; j < matches.length; j++) {
      if (isMatchStarted(matches[j])) {
        allLaterMatchesUnstarted = false;
        break;
      }
    }

    if (allLaterMatchesUnstarted) {
      continue;
    }

    return match;
  }

  return null;
}

export const UpcomingMatch: React.FC<UpcomingMatchProps> = ({
  event,
  onClickMatch,
}) => {
  const division = useCurrentDivision();
  const { data: matches } = useEventMatches(event, division);

  const match = useMemo(() => getUpcomingMatch(matches ?? []), [matches]);
  if (!match) {
    return null;
  }

  return (
    <Button
      mode="normal"
      className="text-left flex gap-2 items-center bg-zinc-700 absolute bottom-14 left-0 z-10 w-full h-12 rounded-b-none"
      data-matchid={match?.id}
      onClick={onClickMatch}
      aria-label={`Jump to Match ${match?.name}`}
    >
      <span className="flex-1">{match?.name}</span>
      <MatchTime match={match} />
      <ArrowRightIcon height={20} />
    </Button>
  );
};

export type MatchesTabProps = {
  event: EventData;
};

export const EventMatchesTab: React.FC<MatchesTabProps> = ({ event }) => {
  const division = useCurrentDivision();
  const { data: matches, isLoading } = useEventMatches(event, division);

  const [open, setOpen] = useState(false);
  const [matchId, setMatchId] = useState<number>(0);

  const onClickMatch = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const matchId = parseInt(e.currentTarget.dataset.matchid ?? "NaN");
    if (isNaN(matchId)) return;
    setMatchId(matchId);
    setTimeout(() => {
      setOpen(true);
    }, 0);
  }, []);

  return (
    <>
      <EventMatchDialog
        key={matchId}
        initialMatchId={matchId}
        open={open}
        setOpen={setOpen}
      />
      <UpcomingMatch event={event} onClickMatch={onClickMatch} />
      <section className="contents">
        <Spinner show={isLoading} />
        <DisconnectedWarning />
        <VirtualizedList
          data={matches}
          options={{ estimateSize: () => 64 }}
          className="flex-1"
          parts={{ list: { className: "mb-24" } }}
        >
          {(match) => <ClickableMatch match={match} onClick={onClickMatch} />}
        </VirtualizedList>
      </section>
    </>
  );
};
