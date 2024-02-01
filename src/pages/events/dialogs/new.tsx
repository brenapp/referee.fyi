import {
  useEventMatches,
  useEventTeams,
  useEventMatch,
  useEventTeam,
} from "~hooks/robotevents";
import { Rule, useRulesForProgram } from "~utils/hooks/rules";
import { Select, TextArea } from "~components/Input";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { TrashIcon } from "@heroicons/react/24/outline";
import { useAddRecentRules, useRecentRules } from "~utils/hooks/history";
import { twMerge } from "tailwind-merge";
import { toast } from "~components/Toast";
import { Spinner } from "~components/Spinner";

export type EventNewIncidentDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  initialTeamNumber?: string | null;
  initialMatchId?: number | null;
  preventSave?: boolean;
};

export const EventNewIncidentDialog: React.FC<EventNewIncidentDialogProps> = ({
  open,
  setOpen,
  initialMatchId,
  initialTeamNumber,
  preventSave,
}) => {
  const { mutate } = useNewIncident();

  const { data: event, isLoading: isLoadingEvent } = useCurrentEvent();
  const division = useCurrentDivision();

  const rules = useRulesForProgram(event?.program.code);
  const { data: recentRules } = useRecentRules(event?.program.code ?? "VRC", 4);
  const { mutateAsync: addRecentRules } = useAddRecentRules(
    event?.program.code ?? "VRC"
  );

  // Find all teams and matches at the event
  const { data: teams, isLoading: isLoadingTeams } = useEventTeams(event);
  const { data: matches, isLoading: isLoadingMatches } = useEventMatches(
    event,
    division
  );

  // Load team and match data
  const initialMatch = useEventMatch(event, division, initialMatchId);

  // Initialise current team and match
  const [team, setTeam] = useState(initialTeamNumber);
  const [match, setMatch] = useState(initialMatch?.id);

  const teamData = useEventTeam(event, team);
  const matchData = useEventMatch(event, division, match);
  const teamMatches = useMemo(() => {
    if (!team) {
      return [];
    }
    return matches?.filter((match) => {
      const teams = match.alliances
        .map((a) => a.teams.map((t) => t.team.name))
        .flat();
      return teams.includes(team);
    });
  }, [matches, team]);

  const isLoadingMetaData =
    isLoadingEvent || isLoadingTeams || isLoadingMatches;

  const [incident, setIncident] = useState<RichIncident>({
    time: new Date(),
    division: division ?? 1,
    event: event?.sku ?? "",
    team: teamData,
    match: matchData,
    rules: [],
    notes: "",
    outcome: IncidentOutcome.Minor,
  });

  useEffect(() => {
    setTeam(initialTeamNumber);
  }, [initialTeamNumber]);

  useEffect(() => {
    setMatch(initialMatchId ?? undefined);
  }, [initialMatchId]);

  useEffect(() => {
    setIncidentField("team", teamData);
    setIncidentField("match", matchData);
  }, [teamData, matchData]);

  const canSave = useMemo(() => {
    if (preventSave) {
      return false;
    }
    if (isLoadingMetaData) {
      return false;
    }
    return !!team;
  }, [preventSave, isLoadingMetaData, team]);

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
        setMatch(undefined);
        setTeam(undefined);
      }

      setIncidentField("team", newTeam);
      setTeam(newTeam?.number);
    },
    [teams]
  );

  const onChangeIncidentMatch = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newMatch = matches?.find((m) => m.id.toString() === e.target.value);

      if (e.target.value === "-1") {
        setMatch(undefined);
        setTeam(undefined);
      }

      if (!newMatch) return;

      setIncidentField("match", newMatch);
      setMatch(newMatch.id);
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
    (rule: Rule) => {
      if (incident.rules.some((r) => r.rule === rule.rule)) return;
      setIncidentField("rules", [...incident.rules, rule]);
    },
    [incident.rules]
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

  const onToggleRule = useCallback(
    (rule: Rule) => {
      if (incident.rules.some((r) => r.rule === rule.rule)) {
        onRemoveRule(rule);
      } else {
        onAddRule(rule);
      }
    },
    [incident.rules, onAddRule, onRemoveRule]
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
      setOpen(false);
      mutate(packed, {
        onSuccess: () => {
          // Do not reset match, for ease of use.
          setTeam(null);

          setIncidentField("team", undefined);
          setIncidentField("notes", "");
          setIncidentField("rules", []);
          setIncidentField("outcome", IncidentOutcome.Minor);
          addRecentRules(incident.rules);
          toast({ type: "info", message: "Created Entry" });
        },
        onError: (error) => {
          toast({ type: "error", message: `${error}` });
        },
      });
    },
    [incident, mutate, setOpen, addRecentRules]
  );

  return (
    <Dialog open={open} mode={DialogMode.Modal} onClose={() => setOpen(false)}>
      <DialogHeader title="New Report" onClose={() => setOpen(false)} />
      <DialogBody>
        <Spinner show={isLoadingMetaData} />
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
            {matchData?.alliances.map((alliance) => (
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
