import { useCurrentDivision, useCurrentEvent } from "~hooks/state";
import {
  useEventMatch,
  useEventMatches,
  useMatchTeams,
  useTeam,
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
import { IncidentWithID } from "~utils/data/incident";
import { DialogMode } from "~components/constants";
import { shortMatchName } from "~utils/data/match";
import { EventTeamsIncidents } from "../team";
import { Match } from "robotevents/out/endpoints/matches";
import { MatchContext } from "~components/Context";

export type TeamSummaryProps = {
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
  matches,
}) => {
  const [open, setOpen] = useState(false);

  const { data: event } = useCurrentEvent();
  const { data: team } = useTeam(number, event?.program.code);

  const teamAlliance = currentMatch.alliances.find((alliance) =>
    alliance.teams.some((t) => t.team.name === number)
  );

  const teamSummary = incidents.map((incident) => {
    const match = matches?.find((m) => m.id === incident.match);
    const rulesList = incident.rules
      .map((r) => r.replace(/[<>]/g, ""))
      .join(" ");

    if (match) {
      return `${shortMatchName(match)}-${rulesList}`;
    }

    return rulesList;
  });

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
        <p
          className={twMerge(
            "py-1 px-2 rounded-md font-mono",
            teamAlliance?.color === "red" ? "text-red-400" : "text-blue-400"
          )}
        >
          {number}
        </p>
        <ul className="text-sm flex-1 ">
          {teamSummary.map((t) => (
            <li key={t} className={twMerge("inline mr-1")}>
              {t}
            </li>
          ))}
        </ul>
        <IconButton
          className="bg-emerald-600 active:bg-black/10 p-2"
          onClick={onClickFlag}
          icon={<FlagIcon height={16} />}
        />
      </summary>
      <EventTeamsIncidents event={event} team={team} />
    </details>
  );
};

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
