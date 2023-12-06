import { useParams } from "react-router-dom";
import {
  useEvent,
  useEventMatch,
  useEventMatchesForTeam,
  useTeam,
} from "~hooks/robotevents";
import { Spinner } from "~components/Spinner";
import { useMemo } from "react";
import { useCurrentEvent } from "~hooks/state";
import { useTeamIncidentsByEvent } from "~hooks/incident";
import { IncidentOutcome, IncidentWithID } from "~utils/data/incident";
import { twMerge } from "tailwind-merge";
import { Tabs } from "~components/Tabs";
import { Event } from "robotevents/out/endpoints/events";
import { Team } from "robotevents/out/endpoints/teams";
import { ClickableMatch } from "~components/ClickableMatch";

type EventTeamsTabProps = {
  event: Event | null | undefined;
  team: Team | null | undefined;
};

const EventTeamsMatches: React.FC<EventTeamsTabProps> = ({ event, team }) => {
  const { data: matches } = useEventMatchesForTeam(event, team);

  return (
    <ul>
      {matches?.map((match) => (
        <ClickableMatch match={match} onClick={() => {}} />
      ))}
    </ul>
  );
};

const IncidentOutcomeClasses: { [O in IncidentOutcome]: string } = {
  [IncidentOutcome.Minor]: "bg-yellow-400",
  [IncidentOutcome.Major]: "bg-red-400",
  [IncidentOutcome.Disabled]: "bg-zinc-900",
};

export type IncidentProps = {
  incident: IncidentWithID;
};

export const Incident: React.FC<IncidentProps> = ({ incident }) => {
  const { data: event } = useEvent(incident.event);
  const { data: match } = useEventMatch(
    event,
    incident.division,
    incident.match
  );

  return (
    <div
      className={twMerge(
        IncidentOutcomeClasses[incident.outcome],
        "px-4 py-2 rounded-md mt-2"
      )}
    >
      <p className="text-sm">
        {[incident.team, match?.name, IncidentOutcome[incident.outcome]].join(
          " • "
        )}
      </p>
      <p>{incident.notes}</p>
      <ul>
        {incident.rules.map((r) => (
          <li key={r} className="text-sm font-mono">
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
};

const EventTeamsIncidents: React.FC<EventTeamsTabProps> = ({ team, event }) => {
  const { data: incidents, isLoading: isIncidentsLoading } =
    useTeamIncidentsByEvent(team?.number, event?.sku);

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

  const teamLocation = useMemo(() => {
    if (!team) return null;
    return [team?.location.city, team?.location.region, team?.location.country]
      .filter(Boolean)
      .join(", ");
  }, [team?.location]);

  return (
    <section>
      <Spinner show={isLoading} />
      {team && (
        <header className="p-4">
          <h1 className="text-xl">
            <span className="font-mono text-emerald-400">{team?.number}</span>
            {" • "}
            <span>{team.team_name}</span>
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
