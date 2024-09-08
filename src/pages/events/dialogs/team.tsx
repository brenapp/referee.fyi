/**
 * Team Isolation Dialog
 **/

import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { Incident } from "~components/Incident";
import { VirtualizedList } from "~components/VirtualizedList";
import { useTeamIncidentsByEvent } from "~utils/hooks/incident";
import { useCurrentEvent } from "~utils/hooks/state";

export type TeamIsolationDialogProps = {
  team?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const TeamIsolationDialog: React.FC<TeamIsolationDialogProps> = ({
  team,
  open,
  setOpen,
}) => {
  const { data: event } = useCurrentEvent();
  const { data: incidents } = useTeamIncidentsByEvent(team, event?.sku);

  if (!team) {
    return null;
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} mode="modal">
      <DialogHeader title={team} onClose={() => setOpen(false)} />
      <DialogBody>
        <VirtualizedList data={incidents} options={{ estimateSize: () => 64 }}>
          {(incident) => (
            <Incident incident={incident} className="h-14 overflow-hidden" />
          )}
        </VirtualizedList>
      </DialogBody>
    </Dialog>
  );
};
