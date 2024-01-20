import { useCurrentDivision, useCurrentEvent } from "~hooks/state";
import {
  useEventMatch,
  useEventMatches,
  useMatchTeams,
} from "~hooks/robotevents";
import { Button, IconButton } from "~components/Button";
import { ArrowLeftIcon, FlagIcon } from "@heroicons/react/20/solid";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { Spinner } from "~components/Spinner";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { useTeamIncidentsByMatch } from "~utils/hooks/incident";
import { EventNewIncidentDialog } from "./new";
import { IncidentOutcome, IncidentWithID } from "~utils/data/incident";
import { DialogMode } from "~components/constants";
import { Match } from "robotevents/out/endpoints/matches";
import { MatchContext } from "~components/Context";
import { Incident } from "~components/Incident";

type TeamSummaryProps = {
  number: string;
  incidents: IncidentWithID[];
  currentMatch: Match;
  matches: Match[];
  onClickFlag: () => void;
};

const TeamSummary: React.FC<TeamSummaryProps> = ({
  number,
  incidents,
  currentMatch,
  onClickFlag,
}) => {
  const [open, setOpen] = useState(false);

  const teamAlliance = currentMatch.alliances.find((alliance) =>
    alliance.teams.some((t) => t.team.name === number)
  );

  const rulesSummary = useMemo(() => {
    const rules: Record<string, IncidentWithID[]> = {};

    for (const incident of incidents) {
      for (const rule of incident.rules) {
        if (rules[rule]) {
          rules[rule].push(incident);
        } else {
          rules[rule] = [incident];
        }
      }
    }

    return Object.entries(rules).sort((a, b) => a[1].length - b[1].length);
  }, [incidents]);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className={twMerge("p-1 rounded-md mb-2")}
    >
      <summary className="flex gap-2 items-center">
        {open ? (
          <ChevronDownIcon height={16} />
        ) : (
          <ChevronRightIcon height={16} />
        )}
        <div
          className={twMerge(
            "py-1 px-2 rounded-md font-mono",
            teamAlliance?.color === "red" ? "text-red-400" : "text-blue-400"
          )}
        >
          <p>{number}</p>
        </div>
        <ul className="text-sm flex-1 ">
          {rulesSummary.map(([rule, incidents]) => {
            let outcome = IncidentOutcome.Minor;
            for (const incident of incidents) {
              if (incident.outcome > outcome) {
                outcome = incident.outcome;
              }
            }

            const highlights: Record<IncidentOutcome, string> = {
              [IncidentOutcome.Minor]: "text-yellow-300",
              [IncidentOutcome.Disabled]: "",
              [IncidentOutcome.Major]: "text-red-300",
            };

            return (
              <li
                key={rule}
                className={twMerge(
                  highlights[outcome],
                  "text-sm font-mono inline mx-1"
                )}
              >
                {incidents.length}x{rule.replace(/[<>]/g, "")}
              </li>
            );
          })}
        </ul>
        <IconButton
          className="bg-emerald-600 active:bg-black/10 p-2"
          onClick={onClickFlag}
          icon={<FlagIcon height={20} />}
        />
      </summary>
      {incidents.map((incident) => (
        <Incident incident={incident} key={incident.id} />
      ))}
    </details>
  );
};

type EventMatchDialogProps = {
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

  const { data: incidentsByTeam } = useTeamIncidentsByMatch(match);

  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  return (
    <>
      <EventNewIncidentDialog
        open={incidentDialogOpen}
        setOpen={setIncidentDialogOpen}
        initialMatchId={match?.id}
        initialTeamId={initialTeamId}
        preventSave={isLoadingMatch}
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
          {match && (
            <div className="mt-4 w-full">
              <MatchContext match={match} allianceClassName="w-full" />
              <section className="mt-4">
                {incidentsByTeam?.map(({ team: number, incidents }) => (
                  <TeamSummary
                    key={number}
                    number={number}
                    incidents={incidents}
                    currentMatch={match}
                    matches={matches ?? []}
                    onClickFlag={() => onClickTeam(number)}
                  />
                ))}
              </section>
            </div>
          )}
        </DialogBody>
      </Dialog>
    </>
  );
};
