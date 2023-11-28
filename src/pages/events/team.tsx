import { useParams } from "react-router-dom";
import { useTeam } from "../../utils/hooks/robotevents";
import { Spinner } from "../../components/Spinner";
import { useMemo } from "react";

export type TeamPageParams = {
  sku: string;
  number: string;
};

export const EventTeamsPage: React.FC = () => {
  const { number } = useParams<TeamPageParams>();
  const { data: team, isLoading } = useTeam(number ?? "");

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
    </section>
  );
};
