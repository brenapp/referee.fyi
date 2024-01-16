import { Event } from "robotevents/out/endpoints/events";
import { Team } from "robotevents/out/endpoints/teams";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { DialogMode } from "~components/constants";
import { EventTeamsIncidents } from "../team";

export type TeamIncidentsDialogProps = {
  team?: Team | null;
  event?: Event | null;
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const TeamIncidentsDialog: React.FC<TeamIncidentsDialogProps> = ({
  team,
  event,
  open,
  setOpen,
}) => {
  return (
    <Dialog open={open} onClose={() => setOpen(false)} mode={DialogMode.Modal}>
      <DialogHeader
        title={team?.number ?? "Incidents"}
        onClose={() => setOpen(false)}
      ></DialogHeader>
      <DialogBody>
        <EventTeamsIncidents event={event} team={team} />
      </DialogBody>
    </Dialog>
  );
};
