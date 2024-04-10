import React, { ReactNode, useCallback, useMemo, useState } from "react";
import { MatchData } from "robotevents/out/endpoints/matches";
import { Button } from "~components/Button";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { Input, RulesMultiSelect, Select, TextArea } from "~components/Input";
import { toast } from "~components/Toast";
import { Revision, WebSocketSender } from "~share/api";
import { IncidentOutcome, IncidentWithID } from "~utils/data/incident";
import { useDeleteIncident, useEditIncident } from "~utils/hooks/incident";
import { useEventMatchesForTeam, useEventTeam } from "~utils/hooks/robotevents";
import { Rule, useRulesForProgram } from "~utils/hooks/rules";
import { useCurrentEvent } from "~utils/hooks/state";

function userString(user?: WebSocketSender) {
  if (!user) {
    return null;
  }

  switch (user.type) {
    case "server": {
      return "Server";
    }
    case "client": {
      return user.name;
    }
  }
}

function timeAgo(input: Date) {
  const date = new Date(input);
  const formatter = new Intl.RelativeTimeFormat("en");
  const ranges = {
    years: 3600 * 24 * 365,
    months: 3600 * 24 * 30,
    weeks: 3600 * 24 * 7,
    days: 3600 * 24,
    hours: 3600,
    minutes: 60,
    seconds: 1,
  };
  const secondsElapsed = (date.getTime() - Date.now()) / 1000;
  for (const [key, value] of Object.entries(ranges)) {
    if (value < Math.abs(secondsElapsed)) {
      const delta = secondsElapsed / value;
      return formatter.format(
        Math.round(delta),
        key as Intl.RelativeTimeFormatUnit
      );
    }
  }
  return formatter.format(-1, "seconds");
}

export const RevisionEntry: React.FC<{ revision: Revision }> = ({
  revision,
}) => {
  const values: [ReactNode, ReactNode] = useMemo(() => {
    switch (revision.property) {
      case "time": {
        return [revision.old.toLocaleString(), revision.new.toLocaleString()];
      }
      case "match": {
        return [
          revision.old?.name ?? "No Match",
          revision.new?.name ?? "No Match",
        ];
      }
      case "rules": {
        return [revision.old.join(" "), revision.new.join(" ")];
      }
      case "notes":
      case "outcome":
      case "division":
      case "id": {
        return [revision.old, revision.new];
      }
    }
  }, [revision]);

  return (
    <p>
      {revision.property}: {values[0]} to {values[1]}
    </p>
  );
};

export type RevisionListProps = {
  incident: IncidentWithID;
};

export const RevisionList: React.FC<RevisionListProps> = ({ incident }) => {
  const creator = useMemo(
    () => userString(incident.revision?.user),
    [incident.revision?.user]
  );

  if (!incident.revision) {
    return null;
  }

  return (
    <section className="mt-2">
      <h2 className="font-bold">Revision History</h2>
      <p>Created By: {creator}</p>

      {incident.revision.history.map((log) => (
        <details className="p-2 bg-zinc-800 mt-2 rounded-md">
          <summary>
            <p className="inline-flex ml-2 items-center justify-between w-max">
              <span className="flex-1">{userString(log.user)}</span>,&nbsp;
              <span>{timeAgo(log.date)}</span>
            </p>
          </summary>
          <ul className="list-disc">
            {log.changes.map((revision) => (
              <li key={revision.property} className="ml-4">
                <RevisionEntry revision={revision} />
              </li>
            ))}
            {log.changes.length < 1 ? (
              <li className="ml-4">No Changes Made</li>
            ) : null}
          </ul>
        </details>
      ))}
    </section>
  );
};

export type EditIncidentDialogProps = {
  open: boolean;
  setOpen: (value: boolean) => void;
  incident: IncidentWithID;
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
  const teamData = useEventTeam(eventData, incident.team);
  const { data: teamMatches } = useEventMatchesForTeam(eventData, teamData);

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

  const game = useRulesForProgram(eventData?.program.code ?? "VRC");

  const onChangeIncidentMatch = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const [division, name] = e.target.value.split("@");
      const match = teamMatches?.find((match) => {
        return (
          match.division.id === Number.parseInt(division) && match.name === name
        );
      });
      setIncident((incident) => ({
        ...incident,
        division: Number.parseInt(division),
        match: match ? { id: match.id, name: match.name } : undefined,
      }));
    },
    [teamMatches]
  );

  const onChangeIncidentOutcome = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setIncident((incident) => ({
        ...incident,
        outcome: e.target.value as IncidentOutcome,
      }));
    },
    []
  );

  const initialRichRules = useMemo(() => {
    const gameRules = game?.ruleGroups.flatMap((group) => group.rules) ?? [];
    return incident.rules.map(
      (rule) => gameRules.find((r) => r.rule === rule)!
    );
  }, [game?.ruleGroups, incident.rules]);

  const [incidentRules, setIncidentRules] = useState(initialRichRules);

  const onChangeIncidentRules = useCallback((rules: Rule[]) => {
    setIncidentRules(rules);
    setIncident((incident) => ({
      ...incident,
      rules: rules.map((r) => r.rule),
    }));
  }, []);

  const onChangeIncidentNotes = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setIncident((incident) => ({ ...incident, notes: e.target.value }));
    },
    []
  );

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
      toast({ type: "error", message: `${e}` });
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
                ? incident.division + "@" + incident.match.name
                : undefined
            }
          >
            <option value={undefined}>Non-Match</option>
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
        {game ? (
          <label>
            <p className="mt-4">Associated Rules</p>
            <RulesMultiSelect
              game={game}
              value={incidentRules}
              onChange={onChangeIncidentRules}
            />
          </label>
        ) : null}
        <label>
          <p className="mt-4">Notes</p>
          <TextArea
            className="w-full mt-2 h-32"
            value={incident.notes}
            onChange={onChangeIncidentNotes}
          />
        </label>
        <RevisionList incident={incident} />
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
