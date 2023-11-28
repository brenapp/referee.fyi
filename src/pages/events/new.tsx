import { useSearchParams } from "react-router-dom";
import {
  useEventMatch,
  useEventMatches,
  useEventTeams,
  useTeam,
} from "../../utils/hooks/robotevents";
import { Team } from "robotevents/out/endpoints/teams";
import { Match } from "robotevents/out/endpoints/matches";
import { Select } from "../../components/Input";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Error, Warning } from "../../components/Warning";
import { Button } from "../../components/Button";
import { MatchContext } from "../../components/Context";
import { useCurrentDivision, useCurrentEvent } from "../../utils/hooks/state";

export type Incident = {
  team?: Team | null;
  match?: Match | null;
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

  const hasTeam = incident.match?.alliances.some((a) =>
    a.teams.some((t) => t.team.id === incident.team?.id)
  );

  if (!hasTeam && incident.team) {
    issues.push({
      message: "Team not in match",
      type: "warning",
    });
  }

  return issues;
}

export type EventNewIncidentPageProps = {};

export const EventNewIncidentPage: React.FC<
  EventNewIncidentPageProps
> = ({}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: event } = useCurrentEvent();
  const division = useCurrentDivision();

  const { data: teams } = useEventTeams(event);
  const { data: matches } = useEventMatches(event, division);

  const { data: team } = useTeam(
    searchParams.get("team") ?? "",
    event?.program.code
  );
  const { data: match } = useEventMatch(
    event,
    1,
    Number.parseInt(searchParams.get("match") ?? "")
  );

  const [incident, setIncident] = useState<Incident>({
    team,
    match,
  });

  useEffect(() => {
    setIncidentField("team", team);
    setIncidentField("match", match);
  }, [team, match]);

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
      {issues.map((issue) =>
        issue.type === "error" ? (
          <Error message={issue.message} className="mt-4" key={issue.message} />
        ) : (
          <Warning
            message={issue.message}
            className="mt-4"
            key={issue.message}
          />
        )
      )}
      <label>
        <p className="mt-4">Team Number</p>
        <Select
          value={incident.team?.number}
          onChange={onChangeIncidentTeam}
          className="max-w-full w-full"
        >
          <option>Pick A Team</option>
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
          <option>Pick A Match</option>
          {matches?.map((match) => (
            <option value={match.id} key={match.id}>
              {match.name}
            </option>
          ))}
        </Select>
      </label>
      {incident.match && (
        <MatchContext match={incident.match} className="mt-4 justify-between" />
      )}
      <Button className="w-full text-center mt-4">Submit</Button>
    </section>
  );
};
