import { useParams } from "react-router-dom";
import {
  useEvent,
  useEventMatch,
  useEventMatchesForTeam,
  useTeam,
} from "~hooks/robotevents";
import { Spinner } from "~components/Spinner";
import { useCallback, useMemo, useState } from "react";
import { useCurrentEvent } from "~hooks/state";
import { useTeamIncidentsByEvent } from "~hooks/incident";
import {
  IncidentOutcome,
  IncidentWithID,
  deleteIncident,
} from "~utils/data/incident";
import { twMerge } from "tailwind-merge";
import { Tabs } from "~components/Tabs";
import { Event } from "robotevents/out/endpoints/events";
import { Team } from "robotevents/out/endpoints/teams";
import { ClickableMatch } from "~components/ClickableMatch";
import { IconButton } from "~components/Button";
import { TrashIcon } from "@heroicons/react/24/outline";
import { queryClient } from "~utils/data/query";
import { EventMatchDialog } from "./dialogs/match";
import { Match } from "robotevents/out/endpoints/matches";

type EventTeamsTabProps = {
  event: Event | null | undefined;
  team: Team | null | undefined;
};

export const EventTeamsMatches: React.FC<EventTeamsTabProps> = ({
  event,
  team,
}) => {
  const { data: matches } = useEventMatchesForTeam(event, team);

  const [matchId, setMatchId] = useState<number>(0);
  const [division, setDivision] = useState(1);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);

  const onClickMatch = useCallback((match: Match) => {
    setMatchId(match.id);
    setDivision(match.division.id);
    setTimeout(() => {
      setMatchDialogOpen(true);
    }, 0);
  }, []);

  return (
    <>
      <EventMatchDialog
        matchId={matchId}
        setMatchId={setMatchId}
        open={matchDialogOpen}
        setOpen={setMatchDialogOpen}
        division={division}
      />
      <ul>
        {matches?.map((match) => (
          <ClickableMatch
            match={match}
            key={match.id}
            onClick={() => onClickMatch(match)}
          />
        ))}
      </ul>
    </>
  );
};

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

  const onRemove = useCallback(async () => {
    await deleteIncident(incident.id);
    queryClient.invalidateQueries({
      queryKey: ["incidents"],
    });
  }, []);

  return (
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
      <IconButton
        className="bg-transparent text-inherit"
        onClick={onRemove}
        icon={<TrashIcon height={20} />}
      ></IconButton>
    </div>
  );
};

export const EventTeamsIncidents: React.FC<EventTeamsTabProps> = ({
  team,
  event,
}) => {
  const { data: incidents, isLoading: isIncidentsLoading } =
    useTeamIncidentsByEvent(team?.number, event?.sku);

  return (
    <ul>
      <Spinner show={isIncidentsLoading} />
      {incidents?.map((incident) => (
        <Incident incident={incident} key={incident.id} />
      ))}
    </ul>
  );
};

export const EventTeamsPage: React.FC = () => {
  const { number } = useParams();
  const { data: event } = useCurrentEvent();
  const { data: team, isLoading } = useTeam(number ?? "", event?.program.code);

  const teamLocation = useMemo(() => {
    if (!team) return null;
    return [team?.location.city, team?.location.region, team?.location.country]
      .filter(Boolean)
      .join(", ");
  }, [team]);

  return (
    <section>
      <Spinner show={isLoading} />
      {team && (
        <header className="p-4">
          <h1 className="text-xl overflow-hidden whitespace-nowrap text-ellipsis max-w-[20ch] lg:max-w-prose">
            <span className="font-mono text-emerald-400">{team?.number}</span>
            {" • "}
            <span className="">{team.team_name}</span>
          </h1>

          <p className="italic">{teamLocation}</p>
        </header>
      )}
      <section>
        <Tabs>
          {{
            Schedule: <EventTeamsMatches event={event} team={team} />,
            Incidents: <EventTeamsIncidents event={event} team={team} />,
          }}
        </Tabs>
      </section>
    </section>
  );
};
