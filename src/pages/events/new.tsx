import { useParams } from "react-router-dom";
import {
  useEvent,
  useEventMatches,
  useEventTeams,
} from "../../utils/hooks/robotevents";
import { Team } from "robotevents/out/endpoints/teams";
import { Match } from "robotevents/out/endpoints/matches";
import { Select } from "../../components/Input";
import { useCallback, useMemo, useState } from "react";

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
  const issues = useMemo(() => getIssues(incident), [incident]);

  const setIncidentField = <T extends keyof Incident>(
    key: T,
    value: Incident[T]
  ) => {
    setIncident((i) => ({
      ...i,
      [key]: value,
    }));
  };

  const onChangeIncidentTeam = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const team = teams?.find((t) => t.number === e.target.value);
      if (!team) return;

      setIncidentField("team", team);
    },
    [teams]
  );

  const onChangeIncidentMatch = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const match = matches?.find((m) => m.id.toString() === e.target.value);
      if (!match) return;

      setIncidentField("match", match);
    },
    [matches]
  );

  return (
    <section className="mt-4">
      <h1 className="text-emerald-400 text-lg">New Report</h1>
      {issues.map((issue) => (
        <p className="text-red-500">{issue.message}</p>
      ))}
      <label>
        <p className="mt-4">Team Number</p>
        <Select
          value={incident.team?.number}
          onChange={onChangeIncidentTeam}
          className="max-w-full w-full"
        >
          <option disabled>Pick A Team</option>
          {teams?.map((team) => (
            <option value={team.number} key={team.id}>
              {team.number} - {team.team_name}
            </option>
          ))}
        </Select>
      </label>
      <label>
        <p className="mt-4">Match</p>
        <Select
          value={incident.match?.id}
          onChange={onChangeIncidentMatch}
          className="max-w-full w-full"
        >
          <option disabled>Pick A Match</option>
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
