import { useCurrentDivision, useCurrentEvent } from "~hooks/state";
import { useEventMatch, useEventMatches } from "~hooks/robotevents";
import { Button } from "~components/Button";
import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useCallback, useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { MatchContext } from "~components/Context";
import { Spinner } from "~components/Spinner";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogMode,
} from "~components/Dialog";

export type EventMatchDialogProps = {
  matchId: number;
  setMatchId: (matchId: number) => void;

  open: boolean;
  setOpen: (open: boolean) => void;
};

export const EventMatchDialog: React.FC<EventMatchDialogProps> = ({
  matchId,
  setMatchId,
  open,
  setOpen,
}) => {
  const { data: event } = useCurrentEvent();
  const division = useCurrentDivision();

  const { data: matches } = useEventMatches(event, division);
  const { data: match } = useEventMatch(event, division, matchId);

  const prevMatch = useMemo(() => {
    return matches?.find((_, i) => matches[i + 1]?.id === match?.id);
  }, [matches, match]);

  const nextMatch = useMemo(() => {
    return matches?.find((_, i) => matches[i - 1]?.id === match?.id);
  }, [matches, match]);

  const onClickPrevMatch = useCallback(() => {
    if (prevMatch) {
      setMatchId(prevMatch.id);
    }
  }, [prevMatch]);

  const onClickNextMatch = useCallback(() => {
    if (nextMatch) {
      setMatchId(nextMatch.id);
    }
  }, [nextMatch]);

  return (
    <Dialog open={open} mode={DialogMode.Modal} onClose={() => setOpen(false)}>
      <DialogHeader title="Matches" onClose={() => setOpen(false)} />
      <DialogBody>
        <nav className="flex items-center">
          <Button
            onClick={onClickPrevMatch}
            className={twMerge(
              "bg-transparent",
              prevMatch ? "visible" : "invisible"
            )}
          >
            <ArrowLeftIcon height={24} />
          </Button>
          <h1 className="flex-1 text-xl text-center">{match?.name}</h1>
          <Button
            onClick={onClickNextMatch}
            className={twMerge(
              "bg-transparent",
              nextMatch ? "visible" : "invisible"
            )}
          >
            <ArrowRightIcon height={24} />
          </Button>
        </nav>
        <Spinner show={!match} />
        <div className="mt-4">
          {match && (
            <MatchContext
              match={match}
              className="w-full"
              allianceClassName="w-full"
            />
          )}
        </div>
      </DialogBody>
    </Dialog>
  );
};
