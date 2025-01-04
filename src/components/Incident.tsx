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

  const highlights = useMemo(() => {
    const base = [
      incident.team,
      incident.match ? matchToString(incident.match) : "Non-Match",
      incident.outcome,
    ];

    if (incident.rules.length > 1) {
      base.push(incident.rules[0] + " + " + (incident.rules.length - 1));
    } else {
      base.push(incident.rules[0]);
    }

    return base;
  }, [incident]);

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
        <div className="flex-1 overflow-clip">
          <p className="text-sm whitespace-nowrap">{highlights.join(" • ")}</p>
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
