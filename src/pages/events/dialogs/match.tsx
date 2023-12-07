import { useCurrentDivision, useCurrentEvent } from "~hooks/state";
import { useEventMatch, useEventMatches } from "~hooks/robotevents";
import { Button } from "~components/Button";
import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import { ArrowRightIcon, FlagIcon } from "@heroicons/react/24/outline";
import { useCallback, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { MatchContext } from "~components/Context";
import { Spinner } from "~components/Spinner";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogMode,
} from "~components/Dialog";
import { useTeamIncidentsByMatch } from "~utils/hooks/incident";
import { EventNewIncidentDialog } from "./new";
import { IncidentOutcome } from "~utils/data/incident";

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

  const { data: incidentsByTeam } = useTeamIncidentsByMatch(match);

  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);

  return (
    <>
      <EventNewIncidentDialog
        open={incidentDialogOpen}
        setOpen={setIncidentDialogOpen}
        initialMatch={match}
      />
      <Dialog
        open={open}
        mode={DialogMode.Modal}
        onClose={() => setOpen(false)}
      >
        <DialogHeader title="Matches" onClose={() => setOpen(false)} />
        <DialogBody className="p-4">
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
              <>
                <MatchContext
                  match={match}
                  className="w-full"
                  allianceClassName="w-full"
                />
                <Button
                  onClick={() => setIncidentDialogOpen(true)}
                  className="w-full text-center bg-emerald-600 mt-4"
                >
                  <FlagIcon height={20} className="inline mr-2 " />
                  New Entry
                </Button>
                <section className="mt-4">
                  <h2 className="text-center">Previous Violations</h2>
                  <div className="flex gap-2 mt-4 items-stretch">
                    {incidentsByTeam?.map(({ team, incidents }) => {
                      const outcomeColors: Record<IncidentOutcome, string> = {
                        [IncidentOutcome.Major]: "text-red-400",
                        [IncidentOutcome.Minor]: "text-yellow-400",
                        [IncidentOutcome.Disabled]: "",
                      };
                      return (
                        <div className="flex-1 flex items-center flex-col rounded-md">
                          <h3 className="font-mono text-center text-emerald-400">
                            {team}
                          </h3>
                          <ul className="text-center font-mono italic flex-1">
                            {incidents.length > 0 ? (
                              incidents.map((incident) => (
                                <>
                                  {incident.rules.map((r) => (
                                    <li
                                      className={twMerge(
                                        outcomeColors[incident.outcome]
                                      )}
                                    >
                                      {r}
                                    </li>
                                  ))}
                                </>
                              ))
                            ) : (
                              <li>None</li>
                            )}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </div>
        </DialogBody>
      </Dialog>
    </>
  );
};
