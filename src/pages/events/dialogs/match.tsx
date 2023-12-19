import { useCurrentDivision, useCurrentEvent } from "~hooks/state";
import { useEventMatch, useEventMatches } from "~hooks/robotevents";
import { Button } from "~components/Button";
import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { FlagIcon } from "@heroicons/react/20/solid";
import { useCallback, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { MatchContext } from "~components/Context";
import { Spinner } from "~components/Spinner";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { useTeamIncidentsByMatch } from "~utils/hooks/incident";
import { EventNewIncidentDialog } from "./new";
import { IncidentOutcome } from "~utils/data/incident";
import { shortMatchName } from "~utils/data/match";
import { Team } from "robotevents/out/endpoints/teams";
import * as robotevents from "robotevents";
import { useQuery } from "react-query";
import { Match } from "robotevents/out/endpoints/matches";

export function useMatchTeams(match?: Match | null) {
  return useQuery(["match_teams", match?.id], async () => {
    if (!match) {
      return null;
    }

    const teams = match.alliances
      .map((alliance) => alliance.teams.map((t) => t.team.id))
      .flat();

    return Promise.all(
      teams.map((id) => robotevents.teams.get(id) as Promise<Team>)
    );
  });
}
import { DialogMode } from "~components/constants";

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

  const { data: matchTeams } = useMatchTeams(match);

  const [initialTeam, setInitialTeam] = useState<Team | undefined>(undefined);

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
  }, [prevMatch, setMatchId]);

  const onClickNextMatch = useCallback(() => {
    if (nextMatch) {
      setMatchId(nextMatch.id);
    }
  }, [nextMatch, setMatchId]);

  const onClickTeam = useCallback(
    async (number: string) => {
      const team = matchTeams?.find((t) => t.number === number);
      setInitialTeam(team ?? undefined);
      setTimeout(() => {
        setIncidentDialogOpen(true);
      }, 0);
    },
    [matchTeams]
  );

  const { data: incidentsByTeam } = useTeamIncidentsByMatch(match);

  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);

  return (
    <>
      <EventNewIncidentDialog
        open={incidentDialogOpen}
        setOpen={setIncidentDialogOpen}
        initialMatch={match}
        initialTeam={initialTeam}
      />
      <Dialog
        open={open}
        mode={DialogMode.Modal}
        onClose={() => setOpen(false)}
      >
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
              <>
                <MatchContext
                  match={match}
                  className="w-full"
                  allianceClassName="w-full"
                />
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
                          <Button
                            className="font-mono text-center bg-emerald-600 mb-2"
                            onClick={() => onClickTeam(team)}
                          >
                            <FlagIcon height={16} className="inline mr-2 " />
                            {team}
                          </Button>
                          <ul className="text-center font-mono italic flex-1">
                            {incidents.length > 0 ? (
                              incidents.map((incident) => {
                                const match = matches?.find(
                                  (v) => incident.match === v.id
                                );
                                return (
                                  <>
                                    {incident.rules.length > 0 ? (
                                      incident.rules.map((r) => (
                                        <li
                                          className={twMerge(
                                            outcomeColors[incident.outcome]
                                          )}
                                        >
                                          {match ? shortMatchName(match) : null}{" "}
                                          {r.replace(/[<>]/g, "")}
                                        </li>
                                      ))
                                    ) : (
                                      <li>
                                        {IncidentOutcome[incident.outcome]}
                                      </li>
                                    )}
                                  </>
                                );
                              })

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
