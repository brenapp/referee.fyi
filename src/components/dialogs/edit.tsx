import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MatchData } from "robotevents";
import { Button } from "~components/Button";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import {
  Input,
  Radio,
  RulesMultiSelect,
  Select,
  TextArea,
} from "~components/Input";
import { toast } from "~components/Toast";
import { IncidentMatchSkills } from "@referee-fyi/share";
import { IncidentOutcome, Incident, matchToString } from "~utils/data/incident";
import { useDeleteIncident, useEditIncident } from "~utils/hooks/incident";
import { useEventMatchesForTeam, useEventTeam } from "~utils/hooks/robotevents";
import { Rule, useRulesForEvent } from "~utils/hooks/rules";
import { useCurrentEvent } from "~utils/hooks/state";
import { EditHistory } from "~components/EditHistory";
import { LWWKeys } from "@referee-fyi/consistency";

export type EditIncidentDialogProps = {
  open: boolean;
  setOpen: (value: boolean) => void;
  incident: Incident;
};

export const EditIncidentDialog: React.FC<EditIncidentDialogProps> = ({
  open,
  setOpen,
  incident: initialIncident,
}) => {
  const [incident, setIncident] = useState(initialIncident);
  const { mutateAsync: deleteIncident } = useDeleteIncident();
  const { mutateAsync: editIncident } = useEditIncident();

  const { data: eventData } = useCurrentEvent();
  const { data: teamData } = useEventTeam(eventData, incident.team);
  const { data: teamMatches } = useEventMatchesForTeam(
    eventData,
    teamData,
    undefined,
    { enabled: open }
  );

  const teamMatchesByDivision = useMemo(() => {
    const divisions: Record<string, MatchData[]> = {};

    if (!teamMatches) {
      return [];
    }

    for (const match of teamMatches) {
      if (divisions[match.division.name]) {
        divisions[match.division.name].push(match);
      } else {
        divisions[match.division.name] = [match];
      }
    }

    return Object.entries(divisions);
  }, [teamMatches]);

  const game = useRulesForEvent(eventData);

  const [dirty, setDirty] = useState<Record<LWWKeys<Incident>, boolean>>({
    match: false,
    outcome: false,
    rules: false,
    notes: false,
  });

  useEffect(() => {
    if (!open) {
      setDirty({ match: false, outcome: false, rules: false, notes: false });
    }
  }, [open]);

  const onChangeIncidentMatch = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      // If they set skills, default to driver1
      if (e.target.value === "Skills") {
        setIncident((incident) => ({
          ...incident,
          match: {
            type: "skills",
            skillsType: "driver",
            attempt: 1,
          },
        }));
        setDirty((dirty) => ({ ...dirty, match: true }));
        return;
      }

      const [division, name] = e.target.value.split("@");
      const match = teamMatches?.find((match) => {
        return (
          match.division.id === Number.parseInt(division) && match.name === name
        );
      });
      setIncident((incident) => ({
        ...incident,
        match: match
          ? {
              type: "match",
              id: match.id,
              name: match.name,
              division: match.division.id,
            }
          : undefined,
      }));
      setDirty((dirty) => ({ ...dirty, match: true }));
    },
    [teamMatches]
  );

  const onChangeIncidentSkillsType = useCallback(
    (type: IncidentMatchSkills["skillsType"]) => {
      setIncident((incident) => ({
        ...incident,
        match:
          incident.match?.type === "skills"
            ? { ...incident.match, skillsType: type }
            : incident.match,
      }));
      setDirty((dirty) => ({ ...dirty, match: true }));
    },
    []
  );

  const onChangeIncidentSkillsAttempt = useCallback((attempt: number) => {
    setIncident((incident) => ({
      ...incident,
      match:
        incident.match?.type === "skills"
          ? { ...incident.match, attempt }
          : incident.match,
    }));
    setDirty((dirty) => ({ ...dirty, match: true }));
  }, []);

  const onChangeIncidentOutcome = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setIncident((incident) => ({
        ...incident,
        outcome: e.target.value as IncidentOutcome,
      }));
      setDirty((dirty) => ({ ...dirty, outcome: true }));
    },
    []
  );

  const enrichRules = useCallback(
    (rules: string[]) => {
      const gameRules = game?.ruleGroups.flatMap((group) => group.rules) ?? [];
      return rules.map((rule) => gameRules.find((r) => r.rule === rule)!);
    },
    [game]
  );

  const initialRichRules = useMemo(() => {
    return enrichRules(incident.rules);
  }, [enrichRules, incident.rules]);

  const [incidentRules, setIncidentRules] = useState(initialRichRules);

  const onChangeIncidentRules = useCallback((rules: Rule[]) => {
    setIncidentRules(rules);
    setIncident((incident) => ({
      ...incident,
      rules: rules.map((r) => r.rule),
    }));
    setDirty((dirty) => ({ ...dirty, rules: true }));
  }, []);

  const onChangeIncidentNotes = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setIncident((incident) => ({ ...incident, notes: e.target.value }));
      setDirty((dirty) => ({ ...dirty, notes: true }));
    },
    []
  );

  // Handle external updates graceful
  useEffect(() => {
    const shouldRun =
      open &&
      JSON.stringify(incident.consistency) !==
        JSON.stringify(initialIncident.consistency);
    if (!shouldRun) return;
    const dirtyValues = Object.entries(dirty).filter(([, value]) => value) as [
      LWWKeys<Incident>,
      boolean,
    ][];
    setIncident((current) => ({
      ...initialIncident,
      ...Object.fromEntries(dirtyValues.map(([key]) => [key, current[key]])),
    }));
    if (!dirty.rules) {
      onChangeIncidentRules(enrichRules(initialIncident.rules));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIncident]);

  const onClickDelete = useCallback(async () => {
    setOpen(false);
    await deleteIncident(incident.id);
    toast({ type: "info", message: "Deleted Incident" });
  }, [deleteIncident, setOpen, incident.id]);

  const onClickSave = useCallback(async () => {
    setOpen(false);
    try {
      await editIncident(incident);
      toast({ type: "info", message: "Saved Incident" });
    } catch (e) {
      toast({
        type: "error",
        message: "Could not save incident!",
        context: JSON.stringify(e),
      });
    }
  }, [editIncident, incident, setOpen]);

  return (
    <Dialog mode="modal" onClose={() => setOpen(false)} open={open}>
      <DialogHeader onClose={() => setOpen(false)} title="Edit Incident" />
      <DialogBody>
        <label>
          <p className="mt-4">Team</p>
          <Input value={incident.team} readOnly className="w-full" />
        </label>
        <label>
          <p className="mt-4">Match</p>
          <Select
            className="w-full"
            onChange={onChangeIncidentMatch}
            value={
              incident.match
                ? incident.match.type === "match"
                  ? `${incident.match.division}@${incident.match.name}`
                  : "Skills"
                : undefined
            }
          >
            <option value={undefined}>Non-Match</option>
            <option value="Skills">Skills</option>
            {teamMatchesByDivision.map(([name, matches]) => {
              return (
                <optgroup key={name} label={name}>
                  {matches.map((match) => (
                    <option
                      key={match.id}
                      value={match.division.id + "@" + match.name}
                    >
                      {match.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </Select>
        </label>
        {incident.match?.type === "skills" ? (
          <div className="flex gap-2 mt-2">
            <Radio
              name="skillsType"
              label="Driver"
              checked={incident.match.skillsType === "driver"}
              onChange={(e) =>
                e.currentTarget.checked
                  ? onChangeIncidentSkillsType("driver")
                  : null
              }
            />
            <Radio
              name="skillsType"
              label="Auto"
              checked={incident.match.skillsType === "programming"}
              onChange={(e) =>
                e.currentTarget.checked
                  ? onChangeIncidentSkillsType("programming")
                  : null
              }
            />
            <Radio
              name="skillsAttempt"
              label="1"
              labelProps={{ className: "flex-1 ml-4" }}
              checked={incident.match.attempt === 1}
              onChange={(e) =>
                e.currentTarget.checked
                  ? onChangeIncidentSkillsAttempt(1)
                  : null
              }
            />
            <Radio
              name="skillsAttempt"
              label="2"
              labelProps={{ className: "flex-1" }}
              checked={incident.match.attempt === 2}
              onChange={(e) =>
                e.currentTarget.checked
                  ? onChangeIncidentSkillsAttempt(2)
                  : null
              }
            />
            <Radio
              name="skillsAttempt"
              label="3"
              labelProps={{ className: "flex-1" }}
              checked={incident.match.attempt === 3}
              onChange={(e) =>
                e.currentTarget.checked
                  ? onChangeIncidentSkillsAttempt(3)
                  : null
              }
            />
          </div>
        ) : null}
        <EditHistory
          value={incident}
          valueKey="match"
          dirty={dirty.match}
          render={(value) => (value ? matchToString(value) : "Non-Match")}
        />
        <label>
          <p className="mt-4">Outcome</p>
          <Select
            value={incident.outcome}
            onChange={onChangeIncidentOutcome}
            className="max-w-full w-full"
          >
            <option value="General">General</option>
            <option value="Minor">Minor</option>
            <option value="Major">Major</option>
            <option value="Disabled">Disabled</option>
          </Select>
        </label>
        <EditHistory
          value={incident}
          valueKey="outcome"
          dirty={dirty.outcome}
          render={(value) => value}
        />
        {game ? (
          <>
            <label>
              <p className="mt-4">Associated Rules</p>
              <RulesMultiSelect
                game={game}
                value={incidentRules}
                onChange={onChangeIncidentRules}
              />
            </label>
            <EditHistory
              value={incident}
              valueKey="rules"
              dirty={dirty.rules}
              render={(value) => (
                <span className="font-mono">{value.join(" ")}</span>
              )}
            />
          </>
        ) : null}
        <label>
          <p className="mt-4">Notes</p>
          <TextArea
            className="w-full mt-2 h-32"
            value={incident.notes}
            onChange={onChangeIncidentNotes}
          />
        </label>
        <EditHistory
          value={incident}
          valueKey="notes"
          dirty={dirty.notes}
          render={(value) => value}
        />
      </DialogBody>
      <nav className="flex gap-4 p-2">
        <Button mode="dangerous" onClick={onClickDelete}>
          Delete Incident
        </Button>
        <Button mode="primary" onClick={onClickSave}>
          Save Incident
        </Button>
      </nav>
    </Dialog>
  );
};
