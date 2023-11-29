import { useSearchParams } from "react-router-dom";
import {
  Rule,
  useEventMatch,
  useEventMatches,
  useEventTeams,
  useRulesForProgram,
  useTeam,
} from "../../utils/hooks/robotevents";
import { Team } from "robotevents/out/endpoints/teams";
import { Match } from "robotevents/out/endpoints/matches";
import { Select, TextArea } from "../../components/Input";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Error, Warning } from "../../components/Warning";
import { Button } from "../../components/Button";
import { MatchContext } from "../../components/Context";
import { useCurrentDivision, useCurrentEvent } from "../../utils/hooks/state";
import { IncidentOutcome } from "../../utils/hooks/incident";

export type IncidentState = {
  team?: Team | null;
  match?: Match | null;
  rules: Rule[];
  notes: string;
  outcome: IncidentOutcome;
};

type Issue = {
  message: string;
  type: "warning" | "error";
};

function getIssues(incident: IncidentState): Issue[] {
  const issues: Issue[] = [];

  if (!incident.team && !incident.match) {
    issues.push({
      message: "Must select at least team or match",
      type: "error",
    });
    return issues;
  }

  const hasTeam = incident.match?.alliances.some((a) =>
    a.teams.some((t) => t.team.id === incident.team?.id)
  );

  if (!hasTeam && incident.match && incident.team) {
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
  const [searchParams] = useSearchParams();

  const { data: event } = useCurrentEvent();
  const division = useCurrentDivision();

  const rules = useRulesForProgram(event?.program.code);

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

  const [incident, setIncident] = useState<IncidentState>({
    team,
    match,
    rules: [],
    notes: "",
    outcome: IncidentOutcome.Minor,
  });

  useEffect(() => {
    setIncidentField("team", team);
    setIncidentField("match", match);
  }, [team, match]);

  const issues = useMemo(() => getIssues(incident), [incident]);
  const canSave = useMemo(() => {
    return issues.every((i) => i.type === "warning");
  }, [issues]);

  const setIncidentField = <T extends keyof IncidentState>(
    key: T,
    value: IncidentState[T]
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

  const onChangeIncidentOutcome = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setIncidentField("outcome", Number.parseInt(e.target.value));
    },
    []
  );

  const onAddRule = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const group = e.target.selectedOptions[0].dataset.rulegroup;
      if (!group) return;

      const rule = rules?.ruleGroups
        .find((g) => g.name === group)
        ?.rules.find((r) => r.rule === e.target.value);

      if (!rule) return;
      setIncidentField("rules", [...incident.rules, rule]);
    },
    [rules, incident.rules]
  );

  const onRemoveRule = useCallback(
    (rule: Rule) => {
      setIncidentField(
        "rules",
        incident.rules.filter((r) => r.rule !== rule.rule)
      );
    },
    [incident.rules]
  );

  const onChangeIncidentNotes = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setIncidentField("notes", e.target.value);
    },
    []
  );
  return (
    <section className="mt-4 relative">
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
      <label>
        <p className="mt-4">Outcome</p>
        <Select
          value={incident.outcome}
          onChange={onChangeIncidentOutcome}
          className="max-w-full w-full"
        >
          <option value={IncidentOutcome.Minor}>Minor</option>
          <option value={IncidentOutcome.Major}>Major</option>
          <option value={IncidentOutcome.Disabled}>Disabled</option>
        </Select>
      </label>
      <label>
        <p className="mt-4">Associated Rules</p>
        <Select className="w-full py-4" value={""} onChange={onAddRule}>
          <option>Pick A Rule</option>
          {rules?.ruleGroups.map((group) => (
            <optgroup label={group.name} key={group.name}>
              {group.rules.map((rule) => (
                <option
                  value={rule.rule}
                  data-rulegroup={group.name}
                  key={rule.rule}
                >
                  {rule.rule}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </label>
      <ul className="mt-4 flex flex-wrap gap-2">
        {incident.rules.map((rule) => (
          <li key={rule.rule}>
            <Button
              className="text-red-400 font-mono"
              onClick={() => onRemoveRule(rule)}
            >
              {rule.rule}
            </Button>
          </li>
        ))}
      </ul>
      <label>
        <p className="mt-4">Notes</p>
        <TextArea
          className="w-full mt-2 h-32"
          value={incident.notes}
          onChange={onChangeIncidentNotes}
        />
      </label>
      <Button
        className="w-full text-center mt-4 bg-emerald-400 text-black"
        disabled={!canSave}
      >
        Submit
      </Button>
    </section>
  );
};
