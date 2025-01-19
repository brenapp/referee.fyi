import { useCurrentDivision, useCurrentEvent } from "~hooks/state";
import { useEventMatches } from "~hooks/robotevents";
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
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogCustomHeader,
} from "~components/Dialog";
import { useTeamIncidentsByMatch } from "~utils/hooks/incident";
import { EventNewIncidentDialog } from "./new";
import {
  IncidentOutcome,
  Incident as IncidentData,
} from "~utils/data/incident";
import { Match } from "robotevents";
import { MatchContext } from "~components/Context";
import { Incident } from "~components/Incident";
import { MatchTime } from "~components/Match";
import { TeamIsolationDialog } from "./team";
import { ArrowsPointingOutIcon } from "@heroicons/react/24/outline";
import { MatchScratchpad } from "~components/scratchpad/Scratchpad";
import { animate, motion, PanInfo, useMotionValue } from "framer-motion";
import useResizeObserver from "use-resize-observer";

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
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="flex gap-2 items-center active:bg-zinc-700 max-w-full mt-0 sticky top-0 bg-zinc-900 h-16 z-10">
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
        <TeamFlagButton match={match} team={number} />
      </summary>
      {/* For performance - don't render Incidents unless the dialog is open */}
      {open ? (
        <>
          {incidents.map((incident) => (
            <Incident
              className="h-14 overflow-hidden"
              incident={incident}
              key={incident.id}
            />
          ))}
          {incidents.length > 0 ? (
            <>
              <TeamIsolationDialog
                key={number}
                team={number}
                open={isolationOpen}
                setOpen={setIsolationOpen}
              />
              <Button
                mode="normal"
                className="flex gap-2 items-center mt-2 justify-center h-12"
                onClick={() => setIsolationOpen(true)}
              >
                <ArrowsPointingOutIcon height={20} />
                <p>Isolate Team</p>
              </Button>
            </>
          ) : null}
        </>
      ) : null}
    </details>
  );
};

type TeamFlagButtonProps = {
  match: Match;
  team: string;
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
        key={match.id + team}
      />
      <Button
        mode="primary"
        {...props}
        className={twMerge(
          "flex items-center w-min flex-shrink-0 my-2",
          props.className
        )}
        onClick={() => setOpen(true)}
        aria-label={`New entry for ${team}`}
      >
        <FlagIcon height={20} className="mr-2" />
        <span>New</span>
      </Button>
    </>
  );
};

type EventMatchViewProps = {
  match?: Match | null;
};
const EventMatchView: React.FC<EventMatchViewProps> = ({ match }) => {
  const { data: incidentsByTeam } = useTeamIncidentsByMatch(match, {
    initialData: () => {
      if (!match) {
        return [];
      }

      const alliances = [match.alliance("red"), match.alliance("blue")];
      const teams =
        alliances.map((a) => a.teams.map((t) => t.team!.name)).flat() ?? [];

      return teams.map((team) => ({ team, incidents: [] }));
    },
  });

  if (!match) {
    return null;
  }

  return (
    <div className="mt-4 mx-2 contents">
      {incidentsByTeam?.map(({ team: number, incidents }) => (
        <TeamSummary
          key={number}
          incidents={incidents}
          match={match}
          number={number}
        />
      ))}
      <MatchScratchpad match={match} />
    </div>
  );
};

const transition = {
  type: "spring",
  bounce: 0,
} as const;

export type EventMatchDialogProps = {
  initialMatchId: number;
  division?: number;

  open: boolean;
  setOpen: (open: boolean) => void;
};

export const EventMatchDialog: React.FC<EventMatchDialogProps> = ({
  open,
  setOpen,
  initialMatchId,
  division: defaultDivision,
}) => {
  const { data: event } = useCurrentEvent();
  const division = useCurrentDivision(defaultDivision);
  const { data: matches } = useEventMatches(event, division);

  const [[matchIndex, animateMatchTransition], setMatchIndex] = useState<
    [index: number, animate: boolean]
  >([0, false]);

  useEffect(() => {
    if (!matches) return;
    const index = matches.findIndex((match) => match.id === initialMatchId);
    if (index !== -1) {
      setMatchIndex([index, false]);
    }
  }, [initialMatchId, setMatchIndex, matches]);

  const match = useMemo(() => matches?.[matchIndex], [matchIndex, matches]);

  const hasNextMatch = matchIndex + 1 < (matches?.length ?? Infinity);
  const hasPrevMatch = matchIndex - 1 >= 0;

  const onClickNextMatch = useCallback(() => {
    if (!matches || !hasNextMatch) return;
    setMatchIndex([matchIndex + 1, true]);
  }, [hasNextMatch, matchIndex, matches]);

  const onClickPrevMatch = useCallback(() => {
    if (!matches || !hasPrevMatch) return;
    setMatchIndex([matchIndex - 1, true]);
  }, [hasPrevMatch, matchIndex, matches]);

  // Swipey Swipe Animation
  const { ref: containerRef, width: containerWidth = 0 } =
    useResizeObserver<HTMLDivElement>();

  const viewsToRender = [-1, 0, 1];
  const x = useMotionValue(0);

  const calculateNewX = useCallback(
    () => -matchIndex * containerWidth,
    [matchIndex, containerWidth]
  );

  const onDragEnd = useCallback(
    (_: Event, dragProps: PanInfo) => {
      const { offset, velocity } = dragProps;

      if (Math.abs(velocity.y) > Math.abs(velocity.x)) {
        animate(x, calculateNewX(), transition);
        return;
      }

      if (offset.x > containerWidth / 6) {
        onClickPrevMatch();
      } else if (offset.x < -containerWidth / 6) {
        onClickNextMatch();
      } else {
        animate(x, calculateNewX(), transition);
      }
    },
    [calculateNewX, containerWidth, onClickNextMatch, onClickPrevMatch, x]
  );

  useEffect(() => {
    if (!animateMatchTransition) {
      x.set(calculateNewX());
      return;
    }
    const controls = animate(x, calculateNewX(), transition);
    return controls.stop;
  }, [matchIndex, calculateNewX, x, animateMatchTransition]);

  return (
    <Dialog
      open={open}
      mode="modal"
      onClose={() => setOpen(false)}
      aria-label={`${match?.name} Dialog`}
    >
      <DialogCustomHeader>
        <DialogCloseButton onClose={() => setOpen(false)} />
        <IconButton
          icon={<ArrowLeftIcon height={24} />}
          onClick={onClickPrevMatch}
          aria-label={`Previous Match: ${matches?.[matchIndex - 1]?.name}`}
          className={twMerge(
            "bg-transparent p-2",
            hasPrevMatch ? "visible" : "invisible"
          )}
        />
        <h1 className="text-xl flex-1">{match?.name}</h1>
        {match && <MatchTime match={match} />}
        <IconButton
          icon={<ArrowRightIcon height={24} />}
          aria-label={`Next Match: ${matches?.[matchIndex + 1]?.name}`}
          onClick={onClickNextMatch}
          className={twMerge(
            "bg-transparent p-2",
            hasNextMatch ? "visible" : "invisible"
          )}
        />
      </DialogCustomHeader>
      <DialogBody className="relative flex flex-col">
        <Spinner show={!match} />
        {match ? (
          <MatchContext
            match={match}
            className="mb-4"
            parts={{ alliance: { className: "w-full" } }}
          />
        ) : null}
        <motion.div
          ref={containerRef}
          style={{
            position: "relative",
            flexGrow: 1,
            overflow: "hidden",
          }}
        >
          {viewsToRender.map((i) => {
            const match = matches?.[matchIndex + i];
            const hiddenProps =
              i !== 0
                ? {
                    "aria-hidden": true,
                    tabIndex: -1,
                    inert: "",
                  }
                : {};
            return (
              <motion.div
                {...hiddenProps}
                key={matchIndex + i}
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  x,
                  left: (matchIndex + i) * containerWidth,
                  right: (matchIndex + i) * containerWidth,
                  overflowY: "auto",
                }}
                draggable
                drag="x"
                dragElastic={1}
                onDragEnd={onDragEnd}
              >
                <EventMatchView key={matchIndex + i} match={match} />
              </motion.div>
            );
          })}
        </motion.div>
      </DialogBody>
    </Dialog>
  );
};
