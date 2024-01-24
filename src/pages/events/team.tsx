import { useParams } from "react-router-dom";
import { useEventMatchesForTeam, useTeam } from "~hooks/robotevents";
import { Spinner } from "~components/Spinner";
import { useCallback, useMemo, useState } from "react";
import { useCurrentEvent } from "~hooks/state";
import { useTeamIncidentsByEvent } from "~hooks/incident";
import { Tabs } from "~components/Tabs";
import { EventData } from "robotevents/out/endpoints/events";
import { TeamData } from "robotevents/out/endpoints/teams";
import { ClickableMatch } from "~components/ClickableMatch";
import { EventMatchDialog } from "./dialogs/match";
import { MatchData } from "robotevents/out/endpoints/matches";
import { Incident } from "~components/Incident";
import { EventNewIncidentDialog } from "./dialogs/new";
import { Button } from "~components/Button";
import { FlagIcon } from "@heroicons/react/20/solid";

type EventTeamsTabProps = {
  event: EventData | null | undefined;
  team: TeamData | null | undefined;
};

export const EventTeamsMatches: React.FC<EventTeamsTabProps> = ({
  event,
  team,
}) => {
  const { data: matches } = useEventMatchesForTeam(event, team);

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
        matchId={matchId}
        setMatchId={setMatchId}
        open={matchDialogOpen}
        setOpen={setMatchDialogOpen}
        division={division}
      />
      <ul>
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
    return <p>No Recorded Entries!</p>;
  }

  return (
    <ul>
      <Spinner show={isIncidentsLoading} />
      {incidents?.map((incident) => (
        <Incident incident={incident} key={incident.id} />
      ))}
    </ul>
  );
};

export const EventTeamsPage: React.FC = () => {
  const { number } = useParams();
  const { data: event } = useCurrentEvent();
  const { data: team, isLoading } = useTeam(number ?? "", event?.program.code);

  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);

  const teamLocation = useMemo(() => {
    if (!team) return null;
    return [team?.location.city, team?.location.region, team?.location.country]
      .filter(Boolean)
      .join(", ");
  }, [team]);

  return (
    <section>
      <EventNewIncidentDialog
        open={incidentDialogOpen}
        setOpen={setIncidentDialogOpen}
        initialTeamNumber={number}
      />
      <Spinner show={isLoading} />
      {team && (
        <header className="p-4">
          <Button
            onClick={() => setIncidentDialogOpen(true)}
            className="w-full text-center bg-emerald-600"
          >
            <FlagIcon height={20} className="inline mr-2 " />
            New Entry
          </Button>
          <h1 className="text-xl overflow-hidden whitespace-nowrap text-ellipsis max-w-[20ch] lg:max-w-prose">
            <span className="font-mono text-emerald-400">{team?.number}</span>
            {" • "}
            <span className="">{team.team_name}</span>
          </h1>

          <p className="italic">{teamLocation}</p>
        </header>
      )}
      <section>
        <Tabs>
          {{
            Schedule: <EventTeamsMatches event={event} team={team} />,
            Incidents: <EventTeamsIncidents event={event} team={team} />,
          }}
        </Tabs>
      </section>
    </section>
  );
};
