/**
 * Team Isolation Dialog
 **/

import { useCallback, useMemo, useState } from "react";
import { EventData, MatchData, ProgramCode, TeamData } from "robotevents";
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogCustomHeader,
} from "~components/Dialog";
import { Incident } from "~components/Incident";
import { Spinner } from "~components/Spinner";
import { VirtualizedList } from "~components/VirtualizedList";
import { useTeamIncidentsByEvent } from "~utils/hooks/incident";
import { useEventMatchesForTeam, useTeam } from "~utils/hooks/robotevents";
import { useCurrentEvent } from "~utils/hooks/state";
import { EventNewIncidentDialog } from "./new";
import { Button } from "~components/Button";
import { ClipboardDocumentListIcon, FlagIcon } from "@heroicons/react/20/solid";
import { Tabs } from "~components/Tabs";
import { EventMatchDialog } from "./match";
import { ClickableMatch } from "~components/Match";

type EventTeamsTabProps = {
  event: EventData | null | undefined;
  team: TeamData | null | undefined;
};

export const EventTeamsMatches: React.FC<EventTeamsTabProps> = ({
  event,
  team,
}) => {
  const { data: matches, isLoading } = useEventMatchesForTeam(event, team);

  const [matchId, setMatchId] = useState<number>(0);
  const [division, setDivision] = useState(1);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);

  const onClickMatch = useCallback((match: MatchData) => {
    setMatchId(match.id);
    setDivision(match.division.id);
    setTimeout(() => {
      setMatchDialogOpen(true);
    }, 0);
  }, []);

  return (
    <>
      <EventMatchDialog
        initialMatchId={matchId}
        open={matchDialogOpen}
        setOpen={setMatchDialogOpen}
        division={division}
      />
      <Spinner show={isLoading} />
      <ul className="flex-1 overflow-auto">
        {matches?.map((match) => (
          <ClickableMatch
            match={match}
            key={match.id}
            onClick={() => onClickMatch(match)}
          />
        ))}
      </ul>
    </>
  );
};

export const EventTeamsIncidents: React.FC<EventTeamsTabProps> = ({
  team,
  event,
}) => {
  const {
    data: incidents,
    isLoading: isIncidentsLoading,
    isSuccess,
  } = useTeamIncidentsByEvent(team?.number, event?.sku);

  if (isSuccess && incidents.length < 1) {
    return <p className="mt-4">No Recorded Entries!</p>;
  }

  return (
    <ul className="contents">
      <Spinner show={isIncidentsLoading} />
      <VirtualizedList data={incidents} options={{ estimateSize: () => 88 }}>
        {(incident) => (
          <Incident incident={incident} key={incident.id} className="h-20" />
        )}
      </VirtualizedList>
    </ul>
  );
};

export type TeamDialogProps = {
  team?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const TeamDialog: React.FC<TeamDialogProps> = ({
  team: number,
  open,
  setOpen,
}) => {
  const { data: event } = useCurrentEvent();
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const { data: team, isPending: isPendingTeam } = useTeam(
    number,
    event?.program.id as ProgramCode
  );

  const isPending = isPendingTeam;

  const teamLocation = useMemo(() => {
    if (!team) return null;
    return [
      team?.location?.city,
      team?.location?.region,
      team?.location?.country,
    ]
      .filter((v) => !!v)
      .join(", ");
  }, [team]);

  if (!number) {
    return null;
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} mode="modal">
      <EventNewIncidentDialog
        open={incidentDialogOpen}
        setOpen={setIncidentDialogOpen}
        initial={{ team: team?.number }}
        key={team?.id}
      />
      <DialogCustomHeader className="flex items-center gap-4 h-[unset] ">
        <DialogCloseButton onClose={() => setOpen(false)} />
        <div className="flex-1">
          <h1 className="text-xl overflow-hidden whitespace-nowrap text-ellipsis max-w-[36ch] lg:max-w-prose">
            <span className="font-mono text-emerald-400">{number}</span>
            {" • "}
            <span>{team?.team_name ?? number}</span>
          </h1>
          <p className="italic">{teamLocation ?? "Unknown Location"}</p>
        </div>
      </DialogCustomHeader>
      <DialogBody>
        <Button onClick={() => setIncidentDialogOpen(true)} mode="primary">
          <FlagIcon height={20} className="inline mr-2 " />
          New Entry
        </Button>
        <Spinner show={isPending} />
        <Tabs>
          {[
            {
              type: "content",
              id: "incidents",
              label: "Incidents",
              icon: (active) =>
                active ? (
                  <FlagIcon height={24} className="inline" />
                ) : (
                  <FlagIcon height={24} className="inline" />
                ),
              content: <EventTeamsIncidents event={event} team={team} />,
            },
            {
              type: "content",
              id: "schedule",
              label: "Schedule",
              icon: (active) =>
                active ? (
                  <ClipboardDocumentListIcon height={24} className="inline" />
                ) : (
                  <ClipboardDocumentListIcon height={24} className="inline" />
                ),
              content: <EventTeamsMatches event={event} team={team} />,
            },
          ]}
        </Tabs>
      </DialogBody>
    </Dialog>
  );
};
