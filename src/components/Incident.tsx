import { twMerge } from "tailwind-merge";
import { IncidentOutcome, IncidentWithID } from "~utils/data/incident";
import { useEvent, useEventMatch } from "~utils/hooks/robotevents";

const IncidentOutcomeClasses: { [O in IncidentOutcome]: string } = {
  [IncidentOutcome.Minor]: "bg-yellow-400 text-yellow-900",
  [IncidentOutcome.Major]: "bg-red-400 text-red-900",
  [IncidentOutcome.Disabled]: "bg-zinc-900",
};

export type IncidentProps = {
  incident: IncidentWithID;
} & React.HTMLProps<HTMLDivElement>;

export const Incident: React.FC<IncidentProps> = ({ incident, ...props }) => {
  const { data: event } = useEvent(incident.event);
  const { data: match } = useEventMatch(
    event,
    incident.division,
    incident.match
  );

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
              match?.name ?? "Event-Wide",
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
      </div>
    </>
  );
};
