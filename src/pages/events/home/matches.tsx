import { useCallback, useState } from "react";
import { EventData } from "robotevents/out/endpoints/events";
import { useEventMatches } from "~utils/hooks/robotevents";
import { useCurrentDivision } from "~utils/hooks/state";
import { EventMatchDialog } from "../dialogs/match";
import { Spinner } from "~components/Spinner";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { ClickableMatch } from "~components/ClickableMatch";

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
