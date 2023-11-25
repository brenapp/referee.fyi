import { useParams } from "react-router-dom";
import { useTeam } from "../../utils/hooks/robotevents";
import { Spinner } from "../../components/Spinner";

export type TeamPageParams = {
  sku: string;
  number: string;
};

export const EventTeamsPage: React.FC = () => {
  const { number } = useParams<TeamPageParams>();
  const { data: team, isLoading } = useTeam(number ?? "");

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

          <p className="italic">
            {team?.location.city}, {team?.location.region},{" "}
            {team?.location.country}
          </p>
        </header>
      )}
    </section>
  );
};
