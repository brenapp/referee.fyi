/**
 * Team Isolation Dialog
 **/

import { useMemo, useState } from "react";
import { ProgramCode } from "robotevents";
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogCustomHeader,
} from "~components/Dialog";
import { Spinner } from "~components/Spinner";
import { useTeam } from "~utils/hooks/robotevents";
import { useCurrentEvent } from "~utils/hooks/state";
import { EventNewIncidentDialog } from "./new";
import { Button } from "~components/Button";
import { FlagIcon } from "@heroicons/react/20/solid";
import { useEventAssetsForTeam } from "~utils/hooks/assets";
import { AssetPreview } from "~components/Assets";
import { useTeamIncidentsByEvent } from "~utils/hooks/incident";
import { VirtualizedList } from "~components/VirtualizedList";
import { Incident } from "~components/Incident";

export type EventTeamAssetsProps = {
  team: string;
  sku: string;
};

export const EventTeamAssets: React.FC<EventTeamAssetsProps> = ({
  team,
  sku,
}) => {
  const assets = useEventAssetsForTeam(sku, team);
  return (
    <div className="grid grid-cols-4 mt-4">
      {assets?.map((asset) => (asset ? <AssetPreview asset={asset} /> : null))}
    </div>
  );
};

export type TeamDialogProps = {
  team?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const TeamDialog: React.FC<TeamDialogProps> = ({
  team: number,
  open,
  setOpen,
}) => {
  const { data: event } = useCurrentEvent();
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const { data: team, isPending: isPendingTeam } = useTeam(
    number,
    event?.program.id as ProgramCode
  );
  const { data: incidents } = useTeamIncidentsByEvent(team?.number, event?.sku);

  const isPending = isPendingTeam;

  const teamLocation = useMemo(() => {
    if (!team) return null;
    return [
      team?.location?.city,
      team?.location?.region,
      team?.location?.country,
    ]
      .filter((v) => !!v)
      .join(", ");
  }, [team]);

  if (!number) {
    return null;
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} mode="modal">
      <EventNewIncidentDialog
        open={incidentDialogOpen}
        setOpen={setIncidentDialogOpen}
        initial={{ team: team?.number }}
        key={team?.id}
      />
      <DialogCustomHeader className="flex items-center gap-4 h-[unset] ">
        <DialogCloseButton onClose={() => setOpen(false)} />
        <div className="flex-1">
          <h1 className="text-xl overflow-hidden whitespace-nowrap text-ellipsis max-w-[36ch] lg:max-w-prose">
            <span className="font-mono text-emerald-400">{number}</span>
            {" • "}
            <span>{team?.team_name ?? number}</span>
          </h1>
          <p className="italic">{teamLocation ?? "Unknown Location"}</p>
        </div>
      </DialogCustomHeader>
      <DialogBody>
        <Button onClick={() => setIncidentDialogOpen(true)} mode="primary">
          <FlagIcon height={20} className="inline mr-2 " />
          New Entry
        </Button>
        <Spinner show={isPending} />
        <div className="mt-4">
          <EventTeamAssets sku={event!.sku} team={number} />
        </div>
        <div className="mt-4">
          <VirtualizedList
            data={incidents}
            options={{ estimateSize: () => 88 }}
          >
            {(incident) => (
              <Incident
                incident={incident}
                key={incident.id}
                className="h-20"
              />
            )}
          </VirtualizedList>
        </div>
      </DialogBody>
    </Dialog>
  );
};
