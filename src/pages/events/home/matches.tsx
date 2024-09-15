import { useCallback, useMemo, useState } from "react";
import { EventData } from "robotevents";
import { useEventMatches } from "~utils/hooks/robotevents";
import { useCurrentDivision } from "~utils/hooks/state";
import { EventMatchDialog } from "../dialogs/match";
import { Spinner } from "~components/Spinner";
import { ClickableMatch, MatchTime } from "~components/Match";
import { Button } from "~components/Button";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { VirtualizedList } from "~components/VirtualizedList";

export type UpcomingMatchProps = {
  event: EventData;
  onClickMatch: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export const UpcomingMatch: React.FC<UpcomingMatchProps> = ({
  event,
  onClickMatch,
}) => {
  const division = useCurrentDivision();
  const { data: matches } = useEventMatches(event, division);

  const match = useMemo(
    () =>
      matches?.find(
        (m) => !m.started && m.alliances.every((a) => a.score === 0)
      ),
    [matches]
  );

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
        <VirtualizedList
          data={matches}
          options={{ estimateSize: () => 64 }}
          className="flex-1 mb-24"
        >
          {(match) => <ClickableMatch match={match} onClick={onClickMatch} />}
        </VirtualizedList>
      </section>
    </>
  );
};
