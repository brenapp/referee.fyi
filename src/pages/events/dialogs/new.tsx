import {
  useEventMatches,
  useEventTeams,
  useEventMatchesForTeam,
} from "~hooks/robotevents";
import { Rule, useRulesForProgram } from "~utils/hooks/rules";
import { Select, TextArea } from "~components/Input";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Error, Warning } from "~components/Warning";
import { Button, IconButton } from "~components/Button";
import { MatchContext } from "~components/Context";
import { useCurrentDivision, useCurrentEvent } from "~hooks/state";
import {
  IncidentOutcome,
  RichIncident,
  packIncident,
} from "~utils/data/incident";
import { useNewIncident } from "~hooks/incident";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { DialogMode } from "~components/constants";
import { Team } from "robotevents/out/endpoints/teams";
import { Match } from "robotevents/out/endpoints/matches";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useAddRecentRules, useRecentRules } from "~utils/hooks/history";
import { twMerge } from "tailwind-merge";

type Issue = {
  message: string;
  type: "warning" | "error";
};

function getIssues(incident: RichIncident): Issue[] {
  const issues: Issue[] = [];

  if (!incident.team && !incident.match) {
    issues.push({
      message: "Please select team or match",
      type: "error",
    });
    return issues;
  }

  if (incident.match && !incident.team) {
    issues.push({
      message: "Pick a team",
      type: "error",
    });
    return issues;
  }

  const hasTeam = incident.match?.alliances.some((a) =>
    a.teams.some((t) => t.team.id === incident.team?.id)
  );

  if (!hasTeam && incident.match && incident.team) {
    issues.push({
      message: "Team not in selected match",
      type: "error",
    });
  }

  return issues;
}

export type EventNewIncidentDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  initialTeam?: Team | null;
  initialMatch?: Match | null;
};

export const EventNewIncidentDialog: React.FC<EventNewIncidentDialogProps> = ({
  open,
  setOpen,
  initialMatch,
  initialTeam,
}) => {
  const { mutate } = useNewIncident();

  const { data: event } = useCurrentEvent();
  const division = useCurrentDivision();

  const rules = useRulesForProgram(event?.program.code);
  const { data: recentRules } = useRecentRules(4);
  const { mutateAsync: addRecentRules } = useAddRecentRules();

  // Find all teams and matches at the event
  const { data: teams } = useEventTeams(event);
  const { data: matches } = useEventMatches(event, division);

  // Initialise current team and match
  const [team, setTeam] = useState(initialTeam);
  const [match, setMatch] = useState(initialMatch);

  const { data: teamMatches } = useEventMatchesForTeam(event, team);

  const [incident, setIncident] = useState<RichIncident>({
    time: new Date(),
    division: division ?? 1,
    event: event?.sku ?? "",
    team,
    match,
    rules: [],
    notes: "",
    outcome: IncidentOutcome.Minor,
  });

  useEffect(() => {
    setIncidentField("team", team);
    setTeam(team);

    setIncidentField("match", match);
    setMatch(match);
  }, [team, match]);

  useEffect(() => {
    if (initialMatch) {
      setIncidentField("match", initialMatch);
      setMatch(initialMatch);
    }
    if (initialTeam) {
      setIncidentField("team", initialTeam);
      setTeam(initialTeam);
    }
  }, [initialMatch, initialTeam]);

  const issues = useMemo(() => getIssues(incident), [incident]);
  const canSave = useMemo(() => {
    return issues.every((i) => i.type === "warning");
  }, [issues]);

  const setIncidentField = <T extends keyof RichIncident>(
    key: T,
    value: RichIncident[T]
  ) => {
    setIncident((i) => ({
      ...i,
      [key]: value,
    }));
  };

  const onChangeIncidentTeam = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newTeam = teams?.find((t) => t.number === e.target.value);
      if (e.target.value === "-1") {
        setMatch(null);
        setTeam(null);
      }

      if (!newTeam) return;

      setIncidentField("team", newTeam);
      setTeam(newTeam);
    },
    [teams]
  );

  const onChangeIncidentMatch = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newMatch = matches?.find((m) => m.id.toString() === e.target.value);

      console.log(e.target.value);
      console.log("newmatch", newMatch);

      if (e.target.value === "-1") {
        setMatch(null);
        setTeam(null);
      }

      if (!newMatch) return;

      setIncidentField("match", newMatch);
      setMatch(newMatch);
    },
    [matches]
  );

  const onChangeIncidentOutcome = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setIncidentField("outcome", Number.parseInt(e.target.value));
    },
    []
  );

  const onToggleRule = useCallback(
    (rule: Rule) => {
      if (incident.rules.some((r) => r.rule === rule.rule)) {
        onRemoveRule(rule);
      } else {
        onAddRule(rule);
      }
    },
    [rules, incident.rules]
  );

  const onAddRule = useCallback(
    (rule: Rule) => {
      if (incident.rules.some((r) => r.rule === rule.rule)) return;
      setIncidentField("rules", [...incident.rules, rule]);
    },
    [rules, incident.rules]
  );

  const onPickOtherRule = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const group = e.target.selectedOptions[0].dataset.rulegroup;
      if (!group) return;

      const rule = rules?.ruleGroups
        .find((g) => g.name === group)
        ?.rules.find((r) => r.rule === e.target.value);

      if (!rule) return;
      if (incident.rules.some((r) => r.rule === rule.rule)) return;
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

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement> | React.MouseEvent) => {
      e.preventDefault();
      const packed = packIncident(incident);
      mutate(packed, {
        onSuccess: () => {
          // Do not reset match, for ease of use.
          setTeam(null);

          setIncidentField("team", null);
          setIncidentField("notes", "");
          setIncidentField("rules", []);
          setIncidentField("outcome", IncidentOutcome.Minor);
          addRecentRules(incident.rules);
          setOpen(false);
        },
      });
    },
    [incident, mutate, setOpen]
  );

  return (
    <Dialog open={open} mode={DialogMode.Modal} onClose={() => setOpen(false)}>
      <DialogHeader title="New Report" onClose={() => setOpen(false)} />
      <DialogBody>
        {issues.map((issue) =>
          issue.type === "error" ? (
            <Error
              message={issue.message}
              className="mt-4"
              key={issue.message}
            />
          ) : (
            <Warning
              message={issue.message}
              className="mt-4"
              key={issue.message}
            />
          )
        )}

        <label>
          <p className="mt-4">Match</p>
          <Select
            value={incident.match?.id ?? -1}
            onChange={onChangeIncidentMatch}
            className="max-w-full w-full"
          >
            <option value={-1}>Pick A Match</option>
            {team &&
              teamMatches?.map((match) => (
                <option value={match.id} key={match.id}>
                  {match.name}
                </option>
              ))}
            {!team &&
              matches?.map((match) => (
                <option value={match.id} key={match.id}>
                  {match.name}
                </option>
              ))}
          </Select>
        </label>
        {incident.match && (
          <MatchContext
            match={incident.match}
            className="mt-4 justify-between"
            allianceClassName="w-full"
          />
        )}
        <label>
          <p className="mt-4">Team</p>
          <Select
            value={incident.team?.number ?? -1}
            onChange={onChangeIncidentTeam}
            className="max-w-full w-full"
          >
            <option value={-1}>Pick A Team</option>
            {match?.alliances.map((alliance) => (
              <optgroup
                key={alliance.color.toUpperCase()}
                label={alliance.color.toUpperCase()}
              >
                {alliance.teams.map(({ team }) => (
                  <option value={team.name} key={team.id}>
                    {team.name}
                  </option>
                ))}
              </optgroup>
            ))}
            {!match &&
              teams?.map((team) => (
                <option value={team.number} key={team.id}>
                  {team.number}
                </option>
              ))}
          </Select>
        </label>
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
        <p className="mt-4">Associated Rules</p>
        <div className="flex mt-2 gap-2">
          {recentRules?.map((rule) => (
            <Button
              className={twMerge(
                "text-emerald-400 font-mono",
                incident.rules.some((r) => r.rule === rule.rule)
                  ? "bg-emerald-600 text-zinc-50"
                  : ""
              )}
              onClick={() => onToggleRule(rule)}
              key={rule.rule}
            >
              {rule.rule}
            </Button>
          ))}
          <label>
            <Select
              className="w-full py-4"
              value={""}
              onChange={onPickOtherRule}
            >
              <option>Pick Rule</option>
              {rules?.ruleGroups.map((group) => (
                <optgroup label={group.name} key={group.name}>
                  {group.rules.map((rule) => (
                    <option
                      value={rule.rule}
                      data-rulegroup={group.name}
                      key={rule.rule}
                    >
                      {rule.rule} {rule.description}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </label>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2">
          {incident.rules.map((rule) => (
            <li
              key={rule.rule}
              className="p-2 flex w-full items-center bg-zinc-800 rounded-md"
            >
              <p className="flex-1 mr-1">
                <strong className="font-mono mr-2">{rule.rule}</strong>
                <span>{rule.description}</span>
              </p>
              <IconButton
                className="bg-transparent"
                icon={<TrashIcon height={24} />}
                onClick={() => onRemoveRule(rule)}
              ></IconButton>
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
          onClick={onSubmit}
        >
          Submit
        </Button>
      </DialogBody>
    </Dialog>
  );
};
