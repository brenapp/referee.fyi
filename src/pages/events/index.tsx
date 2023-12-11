import { Link } from "react-router-dom";
import { useEventMatches, useEventTeams } from "~hooks/robotevents";
import { Spinner } from "~components/Spinner";

import { Tabs } from "~components/Tabs";
import { Event } from "robotevents/out/endpoints/events";
import { Button } from "~components/Button";
import { ExclamationTriangleIcon, FlagIcon } from "@heroicons/react/20/solid";
import { useCurrentDivision, useCurrentEvent } from "~hooks/state";
import { useEventIncidents } from "~hooks/incident";
import { useCallback, useMemo, useState } from "react";
import {
  IncidentOutcome,
  deleteIncident,
  getIncidentsByEvent,
} from "~utils/data/incident";
import { EventNewIncidentDialog } from "./dialogs/new";
import { EventMatchDialog } from "./dialogs/match";
import { ClickableMatch } from "~components/ClickableMatch";
import { Dialog, DialogBody, DialogMode } from "~components/Dialog";

export type MainTabProps = {
  event: Event;
};

const EventTeamsTab: React.FC<MainTabProps> = ({ event }) => {
  const { data: teams, isLoading } = useEventTeams(event);

  const { data: incidents } = useEventIncidents(event.sku);

  const majorIncidents = useMemo(() => {
    if (!incidents) return new Map<string, number>();

    const grouped = new Map<string, number>();

    for (const incident of incidents) {
      if (incident.outcome !== IncidentOutcome.Major) continue;
      const key = incident.team ?? "<none>";
      const count = grouped.get(key) ?? 0;
      grouped.set(key, count + 1);
    }

    return grouped;
  }, [incidents]);

  const minorIncidents = useMemo(() => {
    if (!incidents) return new Map<string, number>();

    const grouped = new Map<string, number>();

    for (const incident of incidents) {
      if (incident.outcome === IncidentOutcome.Major) continue;
      const key = incident.team ?? "<none>";
      const count = grouped.get(key) ?? 0;
      grouped.set(key, count + 1);
    }

    return grouped;
  }, [incidents]);

  return (
    <section>
      <Spinner show={isLoading} />
      <ul>
        {teams?.map((team) => (
          <li key={team.number}>
            <Link
              to={`/${event.sku}/team/${team.number}`}
              className="flex items-center gap-4 mt-4 h-12 text-zinc-50"
            >
              <div className="flex-1">
                <p className="text-emerald-400 font-mono">{team.number}</p>
                <p className="overflow-hidden whitespace-nowrap text-ellipsis max-w-[20ch] lg:max-w-prose">
                  {team.team_name}
                </p>
              </div>
              <p className="h-full w-32 px-2 flex items-center">
                <span className="text-red-400 mr-4">
                  <FlagIcon height={24} className="inline" />
                  <span className="font-mono ml-2">
                    {majorIncidents.get(team.number) ?? 0}
                  </span>
                </span>
                <span className="text-yellow-400">
                  <ExclamationTriangleIcon height={24} className="inline" />
                  <span className="font-mono ml-2">
                    {minorIncidents.get(team.number) ?? 0}
                  </span>
                </span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

const EventMatchesTab: React.FC<MainTabProps> = ({ event }) => {
  const division = useCurrentDivision();
  const { data: matches, isLoading } = useEventMatches(event, division);

  const [open, setOpen] = useState(false);
  const [matchId, setMatchId] = useState<number>(0);

  const onClickMatch = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const matchId = parseInt(e.currentTarget.dataset.matchid ?? "NaN");
    if (isNaN(matchId)) return;
    setMatchId(matchId);
    setOpen(true);
  }, []);

  return (
    <>
      <EventMatchDialog
        matchId={matchId}
        setMatchId={setMatchId}
        open={open}
        setOpen={setOpen}
      />
      <section>
        <Spinner show={isLoading} />
        <ul className="flex-1">
          {matches?.map((match) => (
            <ClickableMatch
              match={match}
              onClick={onClickMatch}
              key={match.id}
            />
          ))}
        </ul>
      </section>
    </>
  );
};

const EventManageTab: React.FC<MainTabProps> = ({ event }) => {
  const [deleteDataDialogOpen, setDeleteDataDialogOpen] = useState(false);

  const onConfirmDeleteData = useCallback(async () => {
    const incidents = await getIncidentsByEvent(event.sku);
    for (const incident of incidents) {
      await deleteIncident(incident.id);
    }
    setDeleteDataDialogOpen(false);
  }, []);

  return (
    <>
      <section>
        <section className="mt-4">
          <h2 className="font-bold">Share Event Data</h2>
          <p>Not currently implemented.</p>
        </section>
        <section className="mt-4 relative">
          <h2 className="font-bold">Delete Event Data</h2>
          <p>
            This will delete all anomaly logs associated with this event. This
            action cannot be undone.
          </p>
          <Button
            className="w-full mt-4 bg-red-500 text-center"
            onClick={() => setDeleteDataDialogOpen(true)}
          >
            Delete Event Data
          </Button>
          <Dialog
            open={deleteDataDialogOpen}
            mode={DialogMode.NonModal}
            className="absolute w-full rounded-md h-min mt-4 bg-zinc-100 text-zinc-900"
            onClose={() => setDeleteDataDialogOpen(false)}
          >
            <DialogBody>
              <p>Really delete all event data? This action cannot be undone.</p>
              <Button
                className="w-full mt-4 bg-red-500 text-center"
                onClick={onConfirmDeleteData}
              >
                Confirm Deletion
              </Button>
              <Button
                className="w-full mt-4 text-center"
                onClick={() => setDeleteDataDialogOpen(false)}
                autoFocus
              >
                Cancel
              </Button>
            </DialogBody>
          </Dialog>
        </section>
      </section>
    </>
  );
};

export const EventPage: React.FC = () => {
  const { data: event } = useCurrentEvent();
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);

  return event ? (
    <section className="mt-4">
      <Button
        onClick={() => setIncidentDialogOpen(true)}
        className="w-full text-center bg-emerald-600"
      >
        <FlagIcon height={20} className="inline mr-2 " />
        New Entry
      </Button>
      <EventNewIncidentDialog
        open={incidentDialogOpen}
        setOpen={setIncidentDialogOpen}
      />
      <Tabs className="mt-4">
        {{
          Matches: <EventMatchesTab event={event} />,
          Teams: <EventTeamsTab event={event} />,
          Manage: <EventManageTab event={event} />,
        }}
      </Tabs>
    </section>
  ) : null;
};
