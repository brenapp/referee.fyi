import { useCurrentDivision, useCurrentEvent } from "~hooks/state";
import {
  useEventMatch,
  useEventMatches,
  useMatchTeams,
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
import { IncidentOutcome, IncidentWithID } from "~utils/data/incident";
import { MatchData } from "robotevents/out/endpoints/matches";
import { MatchContext } from "~components/Context";
import { Incident } from "~components/Incident";
import { TeamData } from "robotevents/out/endpoints/teams";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUturnRightIcon } from "@heroicons/react/24/outline";

const OUTCOME_PRIORITY: IncidentOutcome[] = [
  "Major",
  "Disabled",
  "Minor",
  "General",
];

type TeamSummaryProps = {
  number: string;
  match: MatchData;
  incidents: IncidentWithID[];
};

const TeamSummary: React.FC<TeamSummaryProps> = ({
  number,
  match,
  incidents,
}) => {
  const [open, setOpen] = useState(false);

  const teamAlliance = match.alliances.find((alliance) =>
    alliance.teams.some((t) => t.team.name === number)
  );

  const rulesSummary = useMemo(() => {
    const rules: Record<string, IncidentWithID[]> = {};

    for (const incident of incidents) {
      if (incident.outcome === "General") {
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
      </summary>
      {incidents.map((incident) => (
        <Incident incident={incident} key={incident.id} />
      ))}
    </details>
  );
};

type TeamFlagButtonProps = {
  match: MatchData;
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
      />
      <Button
        mode="primary"
        {...props}
        className={twMerge(
          "flex items-center w-28 flex-shrink-0 mt-2",
          props.className
        )}
        onClick={() => setOpen(true)}
      >
        <FlagIcon height={20} className="mr-2" />
        <span>{team.number}</span>
      </Button>
    </>
  );
};

function formatTime(ms: number) {
  const seconds = Math.floor(Math.abs(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const t = [h, m > 9 ? m : h ? "0" + m : m || "0", s > 9 ? s : "0" + s]
    .filter(Boolean)
    .join(":");
  return ms < 0 && seconds ? `-${t}` : t;
}

export type MatchTimeProps = {
  match?: MatchData;
};

const MatchTime: React.FC<MatchTimeProps> = ({ match }) => {
  const [now, setNow] = useState<number>(Date.now());

  const delta = useMemo(() => {
    if (!match?.scheduled) {
      return undefined;
    }

    const scheduled = new Date(match.scheduled).getTime();

    // upcoming matches
    if (!match.started) {
      const time = scheduled - now;
      return time;
    }

    const started = new Date(match.started).getTime();
    const time = started - scheduled;

    return time;
  }, [match, now]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (typeof delta === "undefined") {
    return null;
  }

  return (
    <span
      className={twMerge(
        "font-mono",
        delta > 0 ? "text-emerald-400" : "text-red-400"
      )}
    >
      {formatTime(delta)}
    </span>
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
  const match = useEventMatch(event, division, matchId);

  const teams = useMatchTeams(event, match);

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

  const { data: incidentsByTeam } = useTeamIncidentsByMatch(match);

  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  return (
    <>
      <EventNewIncidentDialog
        open={incidentDialogOpen}
        setOpen={setIncidentDialogOpen}
      />
      <Dialog open={open} mode="modal" onClose={() => setOpen(false)}>
        <DialogHeader title="Matches" onClose={() => setOpen(false)} />
        <DialogBody className="relative">
          <Spinner show={!match} />
          {match ? (
            <>
              <div className="mt-4 w-full">
                <MatchContext match={match} allianceClassName="w-full" />
                <section className="mt-4">
                  {incidentsByTeam?.map(({ team: number, incidents }) => (
                    <TeamSummary
                      key={number}
                      incidents={incidents}
                      match={match}
                      number={number}
                    />
                  ))}
                </section>
              </div>
              <nav className="flex items-center mx-2 gap-4 absolute left-0 right-0 bottom-60">
                <IconButton
                  icon={<ArrowLeftIcon height={24} />}
                  onClick={onClickPrevMatch}
                  className={twMerge(
                    "bg-transparent p-2",
                    prevMatch ? "visible" : "invisible"
                  )}
                />
                <h1 className="text-xl flex-1">{match?.name}</h1>
                <MatchTime match={match} />
                <IconButton
                  icon={<ArrowRightIcon height={24} />}
                  onClick={onClickNextMatch}
                  className={twMerge(
                    "bg-transparent p-2",
                    nextMatch ? "visible" : "invisible"
                  )}
                />
              </nav>
              <AnimatePresence initial={false}>
                <motion.div
                  key={match.id}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  className="h-52 bg-zinc-800 mb-4 mx-2 p-2 rounded-md absolute bottom-0 left-0 right-0 flex gap-2"
                >
                  <div className="flex-1">
                    <Button
                      mode="normal"
                      className="mt-2 text-left flex justify-between"
                    >
                      Practice #1
                      <ArrowUturnRightIcon height={20} />
                    </Button>
                    <Button
                      mode="normal"
                      className="mt-2 text-left flex justify-between"
                    >
                      Qualifier #1
                      <ArrowUturnRightIcon height={20} />
                    </Button>
                    <Button
                      mode="normal"
                      className="mt-2 text-left flex justify-between"
                    >
                      R16 1-1
                      <ArrowUturnRightIcon height={20} />
                    </Button>
                    <Button
                      mode="normal"
                      className="mt-2 text-left flex justify-between"
                    >
                      QF 1-1
                      <ArrowUturnRightIcon height={20} />
                    </Button>
                  </div>
                  <div className="flex-shrink">
                    {teams.map((team) => {
                      const teamAlliance = match.alliances.find((alliance) =>
                        alliance.teams.some((t) => t.team.name === team.number)
                      );
                      return (
                        <TeamFlagButton
                          match={match}
                          team={team}
                          className={twMerge(
                            teamAlliance?.color === "red"
                              ? "bg-red-400"
                              : "bg-blue-400"
                          )}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </>
          ) : null}
        </DialogBody>
      </Dialog>
    </>
  );
};
