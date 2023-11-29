import { useParams } from "react-router-dom";
import { useTeam } from "../../utils/hooks/robotevents";
import { Spinner } from "../../components/Spinner";
import { useMemo } from "react";
import { useCurrentEvent } from "../../utils/hooks/state";
import { useTeamIncidentsByEvent } from "../../utils/hooks/incident";

export const EventTeamsPage: React.FC = () => {
  const { number } = useParams();
  const { data: event } = useCurrentEvent();
  const { data: team, isLoading } = useTeam(number ?? "", event?.program.code);

  const { data: incidents, isLoading: isIncidentsLoading } =
    useTeamIncidentsByEvent(number, event?.sku);

  const teamLocation = useMemo(() => {
    if (!team) return null;
    return [team?.location.city, team?.location.region, team?.location.country]
      .filter(Boolean)
      .join(", ");
  }, [team?.location]);

  return (
    <section className="p-4">
      <Spinner show={isLoading || isIncidentsLoading} />
      {team && (
        <header>
          <h1 className="text-xl">
            <span className="font-mono text-emerald-400">{team?.number}</span>
            {" • "}
            <span>{team.team_name}</span>
          </h1>

          <p className="italic">{teamLocation}</p>
        </header>
      )}
      <section className="mt-4">
        <h2 className="text-lg">Incidents</h2>
        <ul className="mt-2">
          {incidents?.map((i) => (
            <li key={i.id}>
              <p>{i.notes}</p>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
};
