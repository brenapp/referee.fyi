import { twMerge } from "tailwind-merge";
import {
  IncidentOutcome,
  Incident as IncidentData,
  matchToString,
} from "~utils/data/incident";
import { Button } from "./Button";
import { EditIncidentDialog } from "./dialogs/edit";
import { useMemo, useState } from "react";
import { PencilSquareIcon } from "@heroicons/react/20/solid";
import { useCurrentEvent } from "~utils/hooks/state";
import { useRulesForEvent } from "~utils/hooks/rules";

const IncidentOutcomeClasses: { [O in IncidentOutcome]: string } = {
  Minor: "bg-yellow-400 text-yellow-900",
  Major: "bg-red-400 text-red-900",
  Disabled: "bg-blue-400 text-blue-900",
  General: "bg-zinc-300 text-zinc-900",
};

export type IncidentProps = {
  incident: IncidentData;
  readonly?: boolean;
} & React.HTMLProps<HTMLDivElement>;

export const Incident: React.FC<IncidentProps> = ({
  incident,
  readonly,
  ...props
}) => {
  const [editIncidentOpen, setEditIncidentOpen] = useState(false);

  const { data: eventData } = useCurrentEvent();
  const { data: rules } = useRulesForEvent(eventData);

  const highlights = useMemo(() => {
    const base = [
      <span key={`${incident.id}-name`}>{incident.team}</span>,
      <span key={`${incident.id}-match`}>
        {incident.match ? matchToString(incident.match) : "Non-Match"}
      </span>,
    ];

    var validIcon;
    incident.rules.forEach((rule, count) => {
      const icon = rules?.ruleGroups
        .flatMap((ruleGroup) => {
          const result = ruleGroup.rules.find((r) => r.rule === rule); // Find a matching rule

          if (result?.icon) {
            validIcon = (
              <img
                src={result.icon}
                alt="Icon"
                className="max-h-5 max-w-5 object-contain"
              />
            );
            // Return the icon and stop further processing
            return [validIcon]; // Wrap it in an array for flatMap to work
          }

          return [];
        })
        .find(Boolean); // Find the first valid icon and stop at that point

      if (icon) {
        base.push(<span key={`${incident.id}-icon-${count}`}>{icon}</span>);
      }

      base.push(<span key={`${incident.id}-rule-${count}`}>{rule}</span>);
    });

    // The background colour should make it obvious if an incident is major or minor
    // But add the info at the end for accessability anyway
    base.push(<span key={`${incident.id}-outcome`}>{incident.outcome}</span>);

    return base;
  }, [incident, rules]);

  return (
    <>
      <EditIncidentDialog
        incident={incident}
        key={incident.id}
        open={editIncidentOpen}
        setOpen={setEditIncidentOpen}
      />
      <div
        {...props}
        className={twMerge(
          IncidentOutcomeClasses[incident.outcome],
          "px-4 py-2 rounded-md mt-2 flex",
          props.className
        )}
      >
        <div className="flex-1 overflow-x-auto overflow-y-clip">
          <div className="text-sm whitespace-nowrap">
            <div className="flex items-center gap-x-3">{highlights}</div>
          </div>
          <p>
            {incident.notes}
            {import.meta.env.DEV ? (
              <span className="font-mono text-sm">{incident.id}</span>
            ) : null}
          </p>
          <ul>
            {incident.rules.map((r) => (
              <li key={r} className="text-sm font-mono">
                {r}
              </li>
            ))}
          </ul>
        </div>
        {!readonly ? (
          <Button
            className="w-min text-black/75 active:bg-black/50"
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
