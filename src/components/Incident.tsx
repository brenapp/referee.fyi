import { twMerge } from "tailwind-merge";
import { IncidentOutcome, IncidentWithID } from "~utils/data/incident";
import { IconButton } from "./Button";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useDeleteIncident } from "~utils/hooks/incident";

const IncidentOutcomeClasses: { [O in IncidentOutcome]: string } = {
  [IncidentOutcome.Minor]: "bg-yellow-400 text-yellow-900",
  [IncidentOutcome.Major]: "bg-red-400 text-red-900",
  [IncidentOutcome.Disabled]: "bg-zinc-900",
};

export type IncidentProps = {
  incident: IncidentWithID;
} & React.HTMLProps<HTMLDivElement>;

export const Incident: React.FC<IncidentProps> = ({ incident, ...props }) => {
  const { mutate: onClickDelete } = useDeleteIncident(incident.id);
  return (
    <>
      <div
        {...props}
        className={twMerge(
          IncidentOutcomeClasses[incident.outcome],
          "px-4 py-2 rounded-md mt-2 flex",
          props.className
        )}
      >
        <div className="flex-1">
          <p className="text-sm">
            {[
              incident.team,
              incident.match?.name ?? "Event-Wide",
              IncidentOutcome[incident.outcome],
            ].join(" • ")}
          </p>
          <p>{incident.notes}</p>
          <ul>
            {incident.rules.map((r) => (
              <li key={r} className="text-sm font-mono">
                {r}
              </li>
            ))}
          </ul>
        </div>
        <IconButton
          icon={<TrashIcon height={20} />}
          className="bg-transparent text-black/75"
          onClick={onClickDelete}
        />
      </div>
    </>
  );
};
