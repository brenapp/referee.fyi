import { useCurrentDivision, useCurrentEvent } from "~hooks/state";
import {
  useEventMatch,
  useEventMatches,
  useEventTeam,
} from "~hooks/robotevents";
import { Button, ButtonProps, IconButton } from "~components/Button";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FlagIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/20/solid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { Spinner } from "~components/Spinner";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { useTeamIncidentsByMatch } from "~utils/hooks/incident";
import { EventNewIncidentDialog } from "./new";
import {
  IncidentOutcome,
  Incident as IncidentData,
} from "~utils/data/incident";
import { Match } from "robotevents";
import { MatchContext } from "~components/Context";
import { Incident } from "~components/Incident";
import { TeamData } from "robotevents";
import { MatchTime } from "~components/Match";
import { TeamIsolationDialog } from "./team";
import { ArrowsPointingOutIcon } from "@heroicons/react/24/outline";
import { MatchScratchpad } from "~components/scratchpad/Scratchpad";

const OUTCOME_PRIORITY: IncidentOutcome[] = [
  "Major",
  "Disabled",
  "Minor",
  "General",
];

type TeamSummaryProps = {
  number: string;
  match: Match;
  incidents: IncidentData[];
};

const TeamSummary: React.FC<TeamSummaryProps> = ({
  number,
  match,
  incidents,
}) => {
  const [open, setOpen] = useState(false);
  const [isolationOpen, setIsolationOpen] = useState(false);

  const { data: event } = useCurrentEvent();
  const { data: team } = useEventTeam(event, number);

  const teamAlliance = match.alliances.find((alliance) =>
    alliance.teams.some((t) => t.team?.name === number)
  );

  const rulesSummary = useMemo(() => {
    const rules: Record<string, IncidentData[]> = {};

    for (const incident of incidents) {
      if (incident.outcome === "General") {
        continue;
      }

      if (incident.match?.type !== "match") {
        continue;
      }

      if (incident.rules.length < 1) {
        if (rules["NA"]) {
          rules["NA"].push(incident);
        } else {
          rules["NA"] = [incident];
        }
      }

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

  const hasGeneral = useMemo(() => {
    return incidents.some((incident) => incident.outcome === "General");
  }, [incidents]);

  return (
    <details
      open={open}
      key={number}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="p-1 rounded-md mb-2 max-w-full"
    >
      <summary className="flex gap-2 items-center active:bg-zinc-700 rounded-md max-w-full">
        {open ? (
          <ChevronDownIcon height={16} width={16} className="flex-shrink-0" />
        ) : (
          <ChevronRightIcon height={16} width={16} className="flex-shrink-0" />
        )}
        <div
          className={twMerge(
            "py-1 px-2 rounded-md font-mono flex-shrink-0",
            teamAlliance?.color === "red" ? "text-red-400" : "text-blue-400"
          )}
        >
          <p>
            {number}
            <span className="text-zinc-300">{hasGeneral ? "*" : ""}</span>
          </p>
        </div>
        <ul className="text-sm flex-1 flex-shrink break-normal overflow-x-hidden">
          {rulesSummary.map(([rule, incidents]) => {
            let outcome: IncidentOutcome = "Minor";
            for (const incident of incidents) {
              if (
                OUTCOME_PRIORITY.indexOf(incident.outcome) <
                OUTCOME_PRIORITY.indexOf(outcome)
              ) {
                outcome = incident.outcome;
              }
            }

            const highlights: Record<IncidentOutcome, string> = {
              Minor: "text-yellow-300",
              Disabled: "text-blue-300",
              Major: "text-red-300",
              General: "text-zinc-300",
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
        {team ? <TeamFlagButton match={match} team={team} /> : null}
      </summary>
      {incidents.map((incident) => (
        <Incident incident={incident} key={incident.id} />
      ))}
      {incidents.length > 0 ? (
        <>
          <TeamIsolationDialog
            key={team?.number}
            team={team?.number}
            open={isolationOpen}
            setOpen={setIsolationOpen}
          />
          <Button
            mode="normal"
            className="flex gap-2 items-center mt-2 justify-center"
            onClick={() => setIsolationOpen(true)}
          >
            <ArrowsPointingOutIcon height={20} />
            <p>Isolate Team</p>
          </Button>
        </>
      ) : null}
    </details>
  );
};

type TeamFlagButtonProps = {
  match: Match;
  team: TeamData;
} & ButtonProps;

const TeamFlagButton: React.FC<TeamFlagButtonProps> = ({
  match,
  team,
  ...props
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <EventNewIncidentDialog
        open={open}
        setOpen={setOpen}
        initial={{ match, team }}
        key={match.id + team.id}
      />
      <Button
        mode="primary"
        {...props}
        className={twMerge(
          "flex items-center w-min flex-shrink-0 my-2",
          props.className
        )}
        onClick={() => setOpen(true)}
      >
        <FlagIcon height={20} className="mr-2" />
        <span>New</span>
      </Button>
    </>
  );
};

export type EventMatchDialogProps = {
  matchId: number;
  setMatchId: (matchId: number) => void;

  open: boolean;
  setOpen: (open: boolean) => void;
  division?: number;
};

type EventMatchViewProps = {
  match?: Match | null;
};
const EventMatchView: React.FC<EventMatchViewProps> = ({ match }) => {
  const { data: incidentsByTeam } = useTeamIncidentsByMatch(match);

  console.log(match, incidentsByTeam);

  if (!match) {
    return null;
  }

  return (
    <div className="mt-4 mx-2">
      <MatchContext match={match} allianceClassName="w-full" />
      <section className="mt-4">
        {incidentsByTeam?.map(({ team: number, incidents }) => (
          <TeamSummary
            key={number}
            incidents={incidents}
            match={match}
            number={number}
          />
        )) ??
          match
            .teams()
            .map((team) => (
              <TeamSummary
                key={team.name}
                incidents={[]}
                match={match}
                number={team.name}
              />
            ))}
      </section>
      <MatchScratchpad match={match} />
    </div>
  );
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

  const { data: matches, isSuccess: isLoadingMatchesSuccess } = useEventMatches(
    event,
    division
  );
  const { data: match, isLoading: isLoadingMatch } = useEventMatch(
    event,
    division,
    matchId
  );

  // Edge-case: If the match dialog was open when the match was scored, the match ID no longer
  // exists (RobotEvents creates a new match ID with the same name), so just close the dialog and have
  // the user reopen it to pick the right match. We could try and go find the updated match ID, but
  // I think this is less likely to frustrate them if we (for example, pick the wrong match).
  useEffect(() => {
    if (isLoadingMatchesSuccess && !match) {
      setTimeout(() => {
        setOpen(false);
      }, 100);
    }
  }, [isLoadingMatchesSuccess, match, setOpen]);

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

  console.log("match", match);

  return (
    <>
      <Dialog open={open} mode="modal" onClose={() => setOpen(false)}>
        <DialogHeader title="Matches" onClose={() => setOpen(false)} />
        <DialogBody className="relative">
          <Spinner show={!match || isLoadingMatch} />
          <nav className="flex items-center mx-2 gap-4">
            <IconButton
              icon={<ArrowLeftIcon height={24} />}
              onClick={onClickPrevMatch}
              className={twMerge(
                "bg-transparent p-2",
                prevMatch ? "visible" : "invisible"
              )}
            />
            <h1 className="text-xl flex-1">{match?.name}</h1>
            {match && <MatchTime match={match} />}
            <IconButton
              icon={<ArrowRightIcon height={24} />}
              onClick={onClickNextMatch}
              className={twMerge(
                "bg-transparent p-2",
                nextMatch ? "visible" : "invisible"
              )}
            />
          </nav>
          <EventMatchView match={match} key={match?.name} />
        </DialogBody>
      </Dialog>
    </>
  );
};
