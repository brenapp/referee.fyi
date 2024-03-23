import { useCallback, useMemo, useState } from "react";
import { EventData } from "robotevents/out/endpoints/events";
import { Button, LinkButton } from "~components/Button";
import { deleteIncident, getIncidentsByEvent } from "~utils/data/incident";
import { removeInvitation } from "~utils/data/share";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { Dialog, DialogBody } from "~components/Dialog";
import {
  useCreateInstance,
  useEventInvitation,
  useShareProfile,
} from "~utils/hooks/share";
import { Input } from "~components/Input";
import { toast } from "~components/Toast";

export type ManageTabProps = {
  event: EventData;
};

export const EventManageTab: React.FC<ManageTabProps> = ({ event }) => {
  const [deleteDataDialogOpen, setDeleteDataDialogOpen] = useState(false);

  const { name, setName, persist } = useShareProfile();

  const { mutateAsync: createInstance } = useCreateInstance(event.sku);
  const { data: invitation } = useEventInvitation(event.sku);

  const isSharing = useMemo(
    () => !!invitation && invitation.accepted,
    [invitation]
  );

  const onClickBeginSharing = useCallback(async () => {
    const response = await createInstance();

    if (response.success) {
      toast({ type: "info", message: "Sharing!" });
    } else {
      toast({ type: "error", message: response.details });
    }
  }, []);

  const onConfirmDeleteData = useCallback(async () => {
    const incidents = await getIncidentsByEvent(event.sku);
    await removeInvitation(event.sku);
    for (const incident of incidents) {
      await deleteIncident(incident.id);
    }
    setDeleteDataDialogOpen(false);
  }, [event.sku]);

  return (
    <section className="max-w-xl mx-auto">
      {isSharing ? (
        <section>{JSON.stringify(invitation)}</section>
      ) : (
        <section>
          <section className="mt-2">
            <h2 className="font-bold">Name</h2>
            <Input
              className="w-full"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              onBlur={() => persist()}
            />
          </section>
          <Button mode="primary" className="mt-2" onClick={onClickBeginSharing}>
            Begin Sharing
          </Button>
          <Button mode="normal" className="mt-2">
            Join Existing
          </Button>
        </section>
      )}
      <section className="mt-4">
        <h2 className="font-bold">Event Summary</h2>
        <p>See a summary of all entries at the event.</p>
        <LinkButton
          to={`/${event.sku}/summary`}
          className="w-full mt-2 flex items-center"
        >
          <span className="flex-1">Event Summary</span>
          <ArrowRightIcon height={20} className="text-emerald-400" />
        </LinkButton>
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
          mode="nonmodal"
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
  );
};
