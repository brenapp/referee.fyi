import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MatchData } from "robotevents";
import { Button, IconButton } from "~components/Button";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import {
  Checkbox,
  Radio,
  RulesMultiSelect,
  Select,
  TextArea,
} from "~components/Input";
import { toast } from "~components/Toast";
import {
  IncidentFlag,
  IncidentMatchHeadToHeadPeriod,
  IncidentMatchHeadToHeadPeriodDisplayNames,
  IncidentMatchSkills,
  OUTCOMES,
} from "@referee-fyi/share";
import { IncidentOutcome, Incident, matchToString } from "~utils/data/incident";
import {
  useDeleteIncident,
  useEditIncident,
  useIncident,
} from "~utils/hooks/incident";
import { useEventMatchesForTeam, useEventTeam } from "~utils/hooks/robotevents";
import { Rule, useRulesForEvent } from "~utils/hooks/rules";
import { useCurrentEvent } from "~utils/hooks/state";
import { EditHistory } from "~components/EditHistory";
import { LWWKeys } from "@referee-fyi/consistency";
import { AssetPreview } from "~components/Assets";
import { TrashIcon } from "@heroicons/react/20/solid";
import { getHeadToHeadPeriodsForProgram } from "~utils/data/game";

export type EditIncidentDialogProps = {
  open: boolean;
  setOpen: (value: boolean) => void;
  id: string;
};

export const EditIncidentDialog: React.FC<EditIncidentDialogProps> = ({
  open,
  setOpen,
  id,
}) => {
  const [incident, setIncident] = useState<Incident>();
  const { mutateAsync: deleteIncident } = useDeleteIncident();
  const { mutateAsync: editIncident } = useEditIncident();

  // Handle external updates - since we're using a local state, this needs to be
  // done manually
  const { data: incidentData } = useIncident(id, { enabled: open });
  useEffect(() => {
    if (incidentData) {
      setIncident(incidentData);
    }
  }, [incidentData]);

  // Updates and sets the dirty state for fields.
  const update = useCallback(
    (update: Partial<Pick<Incident, LWWKeys<Incident>>>) => {
      if (!incident) {
        return;
      }

      setIncident((incident) =>
        incident
          ? {
              ...incident,
              ...update,
            }
          : undefined
      );

      setDirty((dirty) => {
        const newDirty = { ...dirty };
        for (const field of Object.keys(update) as LWWKeys<Incident>[]) {
          newDirty[field] = true;
        }
        return newDirty;
      });
    },
    [incident]
  );

  const { data: eventData } = useCurrentEvent();
  const { data: teamData } = useEventTeam(eventData, incident?.team);
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

  const { data: game } = useRulesForEvent(eventData);

  const [dirty, setDirty] = useState<Record<LWWKeys<Incident>, boolean>>({
    match: false,
    outcome: false,
    rules: false,
    notes: false,
    assets: false,
    flags: false,
  });

  const periods = getHeadToHeadPeriodsForProgram(eventData?.program.id);

  useEffect(() => {
    if (!open) {
      setDirty({
        match: false,
        outcome: false,
        rules: false,
        notes: false,
        assets: false,
        flags: false,
      });
    }
  }, [open]);

  const onChangeIncidentMatch = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      // If they set skills, default to driver1
      if (e.target.value === "Skills") {
        update({
          match: {
            type: "skills",
            skillsType: "driver",
            attempt: 1,
          },
        });
        return;
      }

      const [division, name] = e.target.value.split("@");
      const match = teamMatches?.find((match) => {
        return (
          match.division.id === Number.parseInt(division) && match.name === name
        );
      });

      update({
        match: match
          ? {
              type: "match",
              id: match.id,
              name: match.name,
              division: match.division.id,
            }
          : undefined,
      });
    },
    [teamMatches, update]
  );

  const onChangeIncidentMatchPeriod = useCallback(
    (period: IncidentMatchHeadToHeadPeriod | "none") => {
      update({
        match:
          incident?.match?.type === "match"
            ? {
                ...incident.match,
                period: period === "none" ? undefined : period,
              }
            : incident?.match,
      });
    },
    [update, incident?.match]
  );

  const onChangeIncidentSkillsType = useCallback(
    (type: IncidentMatchSkills["skillsType"]) => {
      update({
        match:
          incident?.match?.type === "skills"
            ? { ...incident.match, skillsType: type }
            : incident?.match,
      });
    },
    [update, incident?.match]
  );

  const onChangeIncidentSkillsAttempt = useCallback(
    (attempt: number) => {
      update({
        match:
          incident?.match?.type === "skills"
            ? { ...incident.match, attempt }
            : incident?.match,
      });
    },
    [incident?.match, update]
  );

  const onChangeIncidentOutcome = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      update({
        outcome: e.target.value as IncidentOutcome,
      });
    },
    [update]
  );

  const enrichRules = useCallback(
    (rules: string[]) => {
      const gameRules = game?.ruleGroups.flatMap((group) => group.rules) ?? [];
      return rules
        .map((rule) => gameRules.find((r) => r.rule === rule))
        .filter((x) => !!x);
    },
    [game]
  );

  const initialRichRules = useMemo(() => {
    return enrichRules(incident?.rules ?? []);
  }, [enrichRules, incident?.rules]);

  const [incidentRules, setIncidentRules] = useState(initialRichRules);
  useEffect(() => {
    if (initialRichRules) {
      setIncidentRules(initialRichRules);
    }
  }, [initialRichRules]);

  const onChangeIncidentRules = useCallback(
    (rules: Rule[]) => {
      setIncidentRules(rules);
      update({
        rules: rules.map((r) => r.rule),
      });
    },
    [update]
  );

  const onChangeIncidentNotes = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      update({ notes: e.target.value });
    },
    [update]
  );

  const onChangeFlag = useCallback(
    (flag: IncidentFlag, value: boolean) => {
      update({
        flags: value
          ? [...(incident?.flags ?? []), flag]
          : (incident?.flags?.filter((f) => f !== flag) ?? []),
      });
    },
    [incident?.flags, update]
  );

  const onRemoveAsset = useCallback(
    (assetId: string) => {
      update({
        assets: incident?.assets?.filter((id) => id !== assetId),
      });
    },
    [incident?.assets, update]
  );

  const onClickDelete = useCallback(async () => {
    if (!incident) {
      return;
    }

    setOpen(false);
    await deleteIncident(incident.id);
    toast({ type: "info", message: "Deleted Incident" });
  }, [incident, setOpen, deleteIncident]);

  const onClickSave = useCallback(async () => {
    if (!incident) {
      return;
    }
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
    <Dialog
      mode="modal"
      onClose={() => setOpen(false)}
      open={open}
      aria-label={`Edit incident for ${incident?.team}${
        incident?.match ? `in ${matchToString(incident.match)}` : ""
      }`}
    >
      <DialogHeader onClose={() => setOpen(false)} title="Edit Incident" />
      <DialogBody>
        <div>
          <p>Team</p>
          <p className="font-mono">{incident?.team}</p>
        </div>
        <label>
          <p className="mt-4">Match</p>
          <Select
            className="w-full"
            onChange={onChangeIncidentMatch}
            value={
              incident?.match
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
        {incident?.match?.type === "match" && periods.length > 1 ? (
          <>
            <div
              className="flex gap-2 mt-2"
              role="radiogroup"
              aria-label="Match Period"
            >
              <Radio
                name="matchPeriod"
                label={"None"}
                bind={{
                  value: incident.match.period ?? "none",
                  onChange: onChangeIncidentMatchPeriod,
                  variant: "none",
                }}
              />
              {periods.map((period) => (
                <Radio
                  name="matchPeriod"
                  key={period}
                  label={IncidentMatchHeadToHeadPeriodDisplayNames[period]}
                  bind={{
                    value:
                      incident.match?.type === "match"
                        ? (incident.match.period ?? "none")
                        : "none",
                    onChange: onChangeIncidentMatchPeriod,
                    variant: period,
                  }}
                />
              ))}
            </div>
          </>
        ) : null}
        {incident?.match?.type === "skills" ? (
          <div
            className="flex gap-2 mt-2"
            role="radiogroup"
            aria-label="Skills Match"
          >
            <Radio
              name="skillsType"
              label="Driver"
              bind={{
                value: incident.match.skillsType,
                onChange: onChangeIncidentSkillsType,
                variant: "driver",
              }}
            />
            <Radio
              name="skillsType"
              label="Auto"
              bind={{
                value: incident.match.skillsType,
                onChange: onChangeIncidentSkillsType,
                variant: "programming",
              }}
            />
            <Radio
              name="skillsAttempt"
              label="1"
              className="flex-1 ml-4"
              bind={{
                value: incident.match.attempt,
                onChange: onChangeIncidentSkillsAttempt,
                variant: 1,
              }}
            />
            <Radio
              name="skillsAttempt"
              label="2"
              className="flex-1"
              bind={{
                value: incident.match.attempt,
                onChange: onChangeIncidentSkillsAttempt,
                variant: 2,
              }}
            />
            <Radio
              name="skillsAttempt"
              label="3"
              className="flex-1"
              bind={{
                value: incident.match.attempt,
                onChange: onChangeIncidentSkillsAttempt,
                variant: 3,
              }}
            />
          </div>
        ) : null}
        <EditHistory
          value={incident}
          valueKey="match"
          dirty={dirty.match}
          render={(value) => (value ? matchToString(value) : "Non-Match")}
        />

        {incident?.match?.type === "match" && periods.length > 0 ? (
          <>{incident.match.period}</>
        ) : null}

        <label>
          <p className="mt-4">Outcome</p>
          <Select
            value={incident?.outcome}
            onChange={onChangeIncidentOutcome}
            className="max-w-full w-full"
          >
            {OUTCOMES.map((outcome) => (
              <option key={outcome} value={outcome}>
                {outcome}
              </option>
            ))}
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
            value={incident?.notes}
            onChange={onChangeIncidentNotes}
          />
        </label>
        <EditHistory
          value={incident}
          valueKey="notes"
          dirty={dirty.notes}
          render={(value) => value}
        />
        <label>
          <p className="mt-4">Flag For Review</p>
          <Checkbox
            label="Judging"
            bind={{
              value: incident?.flags?.includes("judge") ?? false,
              onChange: (value) => onChangeFlag("judge", value),
            }}
          />
        </label>
        <EditHistory
          value={incident}
          valueKey="flags"
          dirty={dirty.flags}
          render={(value) => (
            <span className="font-mono">{value?.join(" ")}</span>
          )}
        />
        <section className="mt-4">
          <p>Images</p>
          <div className="grid grid-cols-4 gap-4 mt-2">
            {incident?.assets.map((asset) => (
              <div className="relative" key={asset}>
                <IconButton
                  className="absolute top-0 right-0 p-2 rounded-none rounded-bl-md rounded-tr-md bg-red-500"
                  icon={<TrashIcon height={16} />}
                  onClick={() => onRemoveAsset(asset)}
                />
                <AssetPreview key={asset} asset={asset} />
              </div>
            ))}
          </div>
        </section>
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
