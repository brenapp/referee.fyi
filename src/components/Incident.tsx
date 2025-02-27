import { twMerge } from "tailwind-merge";
import {
  IncidentOutcome,
  Incident as IncidentData,
  matchToString,
} from "~utils/data/incident";
import { Button } from "./Button";
import { EditIncidentDialog } from "./dialogs/edit";
import { useState } from "react";
import { PencilSquareIcon } from "@heroicons/react/20/solid";
import { useCurrentEvent } from "~utils/hooks/state";
import { useRulesForEvent } from "~utils/hooks/rules";

const IncidentOutcomeClasses: { [O in IncidentOutcome]: string } = {
  Minor: "bg-yellow-400 text-yellow-900",
  Major: "bg-red-400 text-red-900",
  Disabled: "bg-blue-400 text-blue-900",
  General: "bg-zinc-300 text-zinc-900",
  Inspection: "bg-zinc-300 text-zinc-900",
};

export type IncidentProps = {
  incident: IncidentData;
  readonly?: boolean;
} & React.HTMLProps<HTMLDivElement>;

export type IncidentHighlightProps = {
  incident: IncidentData;
};

export const IncidentHighlights: React.FC<IncidentHighlightProps> = ({
  incident,
}) => {
  const { data: eventData } = useCurrentEvent();
  const { data: game } = useRulesForEvent(eventData);

  const firstRule = incident.rules[0];
  const firstRuleIcon = game?.rulesLookup?.[firstRule]?.icon;

  return (
    <>
      <span key={`${incident.id}-name`}>{incident.team}</span>
      {"•"}
      <span key={`${incident.id}-match`}>
        {incident.match ? matchToString(incident.match) : "Non-Match"}
      </span>
      {"•"}
      <span className="flex gap-x-1">
        {firstRuleIcon && (
          <img
            alt="Icon"
            className="max-h-5 max-w-5 object-contain"
            src={firstRuleIcon}
          ></img>
        )}
        <span>{firstRule}</span>
      </span>
      {incident.rules.length >= 2 ? (
        <span>+ {incident.rules.length - 1}</span>
      ) : null}
      {"•"}
      <span key={`${incident.id}-outcome`}>{incident.outcome}</span>
    </>
  );
};

export const Incident: React.FC<IncidentProps> = ({
  incident,
  readonly,
  ...props
}) => {
  const [editIncidentOpen, setEditIncidentOpen] = useState(false);

  return (
    <>
      <EditIncidentDialog
        id={incident.id}
        open={editIncidentOpen}
        setOpen={setEditIncidentOpen}
      />
      <div
        {...props}
        className={twMerge(
          IncidentOutcomeClasses[incident.outcome],
          "px-4 py-2 rounded-md mt-2 flex relative",
          props.className
        )}
      >
        <div className="flex-auto overflow-hidden">
          <div className="text-sm whitespace-nowrap">
            <div className="flex items-center gap-x-1">
              <IncidentHighlights incident={incident} />
            </div>
          </div>
          <p>
            {incident.notes}
            {import.meta.env.DEV ? (
              <span className="font-mono text-sm">{incident.id}</span>
            ) : null}
          </p>
        </div>
        {!readonly ? (
          <Button
            className={twMerge(
              IncidentOutcomeClasses[incident.outcome],
              "w-min text-back/75 active:bg-black/50 flex-none basis-auto"
            )}
            mode="transparent"
            onClick={() => setEditIncidentOpen(true)}
          >
            <PencilSquareIcon height={20} />
          </Button>
        ) : null}
      </div>
    </>
  );
};
