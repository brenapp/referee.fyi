import { useCurrentDivision, useCurrentEvent } from "~hooks/state";
import { useEventMatch, useEventMatches } from "~hooks/robotevents";
import { Button, IconButton } from "~components/Button";
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/20/solid";
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
import { DialogMode } from "~components/constants";
import { Match } from "robotevents/out/endpoints/matches";
import { useQuery } from "react-query";
import * as robotevents from "robotevents";
import { TeamIncidentsDialog } from "./team";
import { Team } from "robotevents/out/endpoints/teams";

export function useMatchTeams(match?: Match | null) {
  return useQuery(["match_teams", match?.id], async () => {
    if (!match) {
      return null;
    }

    const teams = match.alliances
      .map((alliance) => alliance.teams.map((t) => t.team.id))
      .flat();

    return robotevents.teams.search({ id: teams });
  });
}

export type EventMatchDialogProps = {
  matchId: number;
  setMatchId: (matchId: number) => void;

  open: boolean;
  setOpen: (open: boolean) => void;
  division?: number;
};

export const EventMatchDialog: React.FC<EventMatchDialogProps> = ({
  matchId,
  setMatchId,
  open,
  setOpen,
  division: defaultDivision,
}) => {
  const { data: event } = useCurrentEvent();
  const division = useCurrentDivision(defaultDivision);

  const { data: matches } = useEventMatches(event, division);
  const { data: match, isLoading: isLoadingMatch } = useEventMatch(
    event,
    division,
    matchId
  );

  const { data: matchTeams } = useMatchTeams(match);

  const [initialTeamId, setInitialTeamId] = useState<number | undefined>(
    undefined
  );

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
      setInitialTeamId(team?.id ?? undefined);
      setTimeout(() => {
        setIncidentDialogOpen(true);
      }, 0);
    },
    [matchTeams]
  );

  const onClickTeamDetail = useCallback(
    async (number: string) => {
      const team = matchTeams?.find((t) => t.number === number);
      setTeamDialogTeam(team);
      setTimeout(() => {
        setTeamIncidentDialogOpen(true);
      }, 0);
    },
    [matchTeams]
  );

  const { data: incidentsByTeam } = useTeamIncidentsByMatch(match);

  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [teamIncidentDialogOpen, setTeamIncidentDialogOpen] = useState(false);
  const [teamDialogTeam, setTeamDialogTeam] = useState<Team | undefined>(
    undefined
  );

  return (
    <>
      <EventNewIncidentDialog
        open={incidentDialogOpen}
        setOpen={setIncidentDialogOpen}
        initialMatchId={match?.id}
        initialTeamId={initialTeamId}
        preventSave={isLoadingMatch}
      />
      <TeamIncidentsDialog
        open={Boolean(teamDialogTeam) && teamIncidentDialogOpen}
        setOpen={setTeamIncidentDialogOpen}
        team={teamDialogTeam}
        event={event}
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
                      const teamAlliance = match.alliances.find((alliance) =>
                        alliance.teams.some((t) => t.team.name === team)
                      );

                      return (
                        <div
                          className={twMerge(
                            "flex-1 flex items-center flex-col"
                          )}
                          key={team}
                        >
                          <header
                            className={twMerge(
                              "rounded-md mb-2 w-full",
                              teamAlliance?.color === "red" && "bg-red-600",
                              teamAlliance?.color === "blue" && "bg-blue-600"
                            )}
                          >
                            <p
                              className={twMerge(
                                "font-mono text-center mb-2 w-full rounded-t-md",
                                teamAlliance?.color === "red" &&
                                  "bg-red-400 border border-red-400",
                                teamAlliance?.color === "blue" &&
                                  "bg-blue-400 border border-blue-400"
                              )}
                            >
                              {team}
                            </p>
                            <nav className="flex gap-2 m-2 justify-center">
                              <IconButton
                                className="bg-transparent p-2"
                                icon={<FlagIcon height={16} />}
                                onClick={() => onClickTeam(team)}
                              />
                              <IconButton
                                className="bg-transparent p-2"
                                icon={<ArrowTopRightOnSquareIcon height={16} />}
                                onClick={() => onClickTeamDetail(team)}
                              />
                            </nav>
                          </header>
                          <ul className="text-center font-mono italic flex-1 mb-2">
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
                                          key={r}
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
