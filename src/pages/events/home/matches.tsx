import { useCallback, useMemo, useState } from "react";
import { EventData } from "robotevents/out/endpoints/events";
import { useEventMatches } from "~utils/hooks/robotevents";
import { useCurrentDivision } from "~utils/hooks/state";
import { EventMatchDialog } from "../dialogs/match";
import { Spinner } from "~components/Spinner";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { ClickableMatch, MatchTime } from "~components/Match";
import { Button } from "~components/Button";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

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
      className="text-left flex gap-2 items-center bg-zinc-700 mb-2"
      data-matchid={match?.id}
      onClick={onClickMatch}
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
    setOpen(true);
  }, []);

  return (
    <>
      <EventMatchDialog
        matchId={matchId}
        setMatchId={setMatchId}
        open={open}
        setOpen={setOpen}
      />
      <UpcomingMatch event={event} onClickMatch={onClickMatch} />
      <section className="flex-1">
        <Spinner show={isLoading} />
        <AutoSizer>
          {(size) => (
            <List
              width={size.width}
              height={size.height}
              itemCount={matches?.length ?? 0}
              itemSize={64}
            >
              {({ index, style }) => {
                const match = matches?.[index];

                if (!match) {
                  return <div style={style} key={index}></div>;
                }

                return (
                  <div style={style}>
                    <ClickableMatch
                      match={match}
                      onClick={onClickMatch}
                      key={match.id}
                    />
                  </div>
                );
              }}
            </List>
          )}
        </AutoSizer>
      </section>
    </>
  );
};
