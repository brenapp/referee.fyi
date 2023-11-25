import { useParams } from "react-router-dom";
import {
  useEvent,
  useEventMatches,
  useEventTeams,
} from "../../utils/hooks/robotevents";
import { Team } from "robotevents/out/endpoints/teams";
import { Match } from "robotevents/out/endpoints/matches";
import { Select } from "../../components/Input";
import { useState } from "react";

export type Incident = {
  team?: Team;
  match?: Match;
};

type Issue = {
  message: string;
  type: "warning" | "error";
};

function getIssues(incident: Incident): Issue[] {
  const issues: Issue[] = [];

  if (!incident.team && !incident.match) {
    issues.push({
      message: "Must select at least team or match",
      type: "error",
    });
  }

  return issues;
}

export type EventNewIncidentPageProps = {
  team?: Team;
  match?: Match;
};

export const EventNewIncidentPage: React.FC<EventNewIncidentPageProps> = ({
  team,
  match,
}) => {
  const { sku } = useParams();

  const { data: event } = useEvent(sku ?? "");
  const { data: teams } = useEventTeams(event);
  const { data: matches } = useEventMatches(event, 1);

  const [incident, setIncident] = useState<Incident>({
    team,
    match,
  });

  return (
    <section className="mt-4">
      <h1 className="text-emerald-400 text-lg">New Report</h1>
      <label>
        <p className="mt-4">Team Number</p>
        <Select value={incident.team?.number} className="max-w-full w-full">
          {teams?.map((team) => (
            <option value={team.number} key={team.id}>
              {team.number} - {team.team_name}
            </option>
          ))}
        </Select>
      </label>
      <label>
        <p className="mt-4">Match</p>
        <Select value={incident.match?.id} className="max-w-full w-full">
          {matches?.map((match) => (
            <option value={match.id} key={match.id}>
              {match.name}
            </option>
          ))}
        </Select>
      </label>
    </section>
  );
};
