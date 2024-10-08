import { useParams } from "react-router-dom";
import { useEventMatchesForTeam, useEventTeam } from "~hooks/robotevents";
import { Spinner } from "~components/Spinner";
import { useCallback, useMemo, useState } from "react";
import { useCurrentEvent } from "~hooks/state";
import { useTeamIncidentsByEvent } from "~hooks/incident";
import { Tabs } from "~components/Tabs";
import { EventData } from "robotevents";
import { TeamData } from "robotevents";
import { ClickableMatch } from "~components/Match";
import { EventMatchDialog } from "./dialogs/match";
import { MatchData } from "robotevents";
import { Incident } from "~components/Incident";
import { EventNewIncidentDialog } from "./dialogs/new";
import { Button } from "~components/Button";
import { VirtualizedList } from "~components/VirtualizedList";

import { ClipboardDocumentListIcon } from "@heroicons/react/24/solid";
import { FlagIcon } from "@heroicons/react/24/solid";

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

export const EventTeamsPage: React.FC = () => {
  const { number } = useParams();
  const { data: event } = useCurrentEvent();
  const { data: team } = useEventTeam(event, number ?? "");
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);

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

  return (
    <section className="flex flex-col">
      <EventNewIncidentDialog
        open={incidentDialogOpen}
        setOpen={setIncidentDialogOpen}
        initial={{ team: team?.number }}
        key={team?.id}
      />
      <header className="mt-4">
        <Button onClick={() => setIncidentDialogOpen(true)} mode="primary">
          <FlagIcon height={20} className="inline mr-2 " />
          New Entry
        </Button>
        <h1 className="text-xl overflow-hidden whitespace-nowrap text-ellipsis max-w-[20ch] lg:max-w-prose mt-4">
          <span className="font-mono text-emerald-400">{number}</span>
          {" • "}
          <span>{team?.team_name}</span>
        </h1>
        <p className="italic">{teamLocation}</p>
      </header>
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
    </section>
  );
};

export default EventTeamsPage;
