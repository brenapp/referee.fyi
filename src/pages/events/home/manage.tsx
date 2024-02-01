import { useCallback, useId, useMemo, useState } from "react";
import { EventData } from "robotevents/out/endpoints/events";
import { Button, LinkButton } from "~components/Button";
import { Spinner } from "~components/Spinner";
import { toast } from "~components/Toast";
import { deleteIncident, getIncidentsByEvent } from "~utils/data/incident";
import { ShareConnection, leaveShare } from "~utils/data/share";
import { useEventIncidents } from "~utils/hooks/incident";
import {
  useActiveUsers,
  useCreateShare,
  useShareCode,
  useShareConnection,
  useShareName,
} from "~utils/hooks/share";
import { FlagIcon, KeyIcon, UserCircleIcon } from "@heroicons/react/20/solid";
import { Dialog, DialogBody } from "~components/Dialog";
import { ButtonMode, DialogMode } from "~components/constants";
import { Input } from "~components/Input";

export type ManageTabProps = {
  event: EventData;
};

export const EventManageTab: React.FC<ManageTabProps> = ({ event }) => {
  const [deleteDataDialogOpen, setDeleteDataDialogOpen] = useState(false);

  const {
    name: shareName,
    setName,
    persist: persistShareName,
  } = useShareName();
  const shareNameId = useId();

  const { data: shareCode } = useShareCode(event.sku);
  const isSharing = !!shareCode;

  const connection = useShareConnection();
  const activeUsers = useActiveUsers();
  const isOwner = useMemo(() => {
    return connection.owner === shareName;
  }, [connection, shareName]);

  const { data: entries } = useEventIncidents(event?.sku);

  const { mutateAsync: beginSharing, isPending: isPendingShare } =
    useCreateShare();
  const onClickShare = useCallback(async () => {
    const shareId = await ShareConnection.getUserId();
    const incidents = await getIncidentsByEvent(event.sku);

    const response = await beginSharing({
      incidents,
      owner: { id: shareId, name: shareName ?? "" },
      sku: event.sku,
    });

    if (response.success) {
      toast({ type: "info", message: "Sharing Enabled" });
    } else {
      toast({ type: "error", message: response.details });
    }
  }, [beginSharing, event.sku, shareName]);

  const onClickShareCode = useCallback(async () => {
    const url = new URL(`/${event.sku}/join?code=${shareCode}`, location.href);
    const shareData = {
      url: url.href,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      navigator.share(shareData);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url.href);
    }
  }, [shareCode, event.sku]);

  const onClickStopSharing = useCallback(async () => {
    await leaveShare(event.sku);
  }, [event.sku]);

  const onConfirmDeleteData = useCallback(async () => {
    const incidents = await getIncidentsByEvent(event.sku);
    await leaveShare(event.sku);
    for (const incident of incidents) {
      await deleteIncident(incident.id);
    }
    setDeleteDataDialogOpen(false);
  }, [event.sku]);

  return (
    <>
      <section>
        <section className="mt-4">
          <h2 className="font-bold">Share Event Data</h2>
          <Spinner show={isPendingShare} />
          {isSharing ? (
            <section>
              <p>
                Use this share code to give read and write access to other
                devices. Treat this code with caution!
              </p>
              <p className="mt-4">Share Name: {shareName}</p>
              <Button
                className="w-full font-mono text-5xl mt-4 text-center"
                onClick={onClickShareCode}
              >
                {shareCode}
              </Button>
              <Button
                className="w-full mt-4 bg-red-500 text-center"
                onClick={onClickStopSharing}
              >
                {isOwner ? "Stop Sharing" : "Leave Share"}
              </Button>
              <nav className="flex gap-2 justify-evenly mt-4">
                <p className="text-lg">
                  <KeyIcon height={20} className="inline mr-2" />
                  <span className="text-zinc-400">{connection.owner}</span>
                </p>
                <p className="text-lg">
                  <FlagIcon height={20} className="inline mr-2" />
                  <span className="text-zinc-400">
                    {entries?.length ?? 0} entries
                  </span>
                </p>
                <p className="text-lg">
                  <UserCircleIcon height={20} className="inline mr-2" />
                  <span className="text-zinc-400">
                    {activeUsers.length} active
                  </span>
                </p>
              </nav>
            </section>
          ) : (
            <div className="mt-2">
              <label htmlFor={shareNameId}>
                <p>Your Name</p>
                <Input
                  id={shareNameId}
                  required
                  value={shareName}
                  onChange={(e) => setName(e.currentTarget.value)}
                  onBlur={persistShareName}
                  className="w-full"
                />
              </label>
              <Button
                className="disabled:bg-zinc-400 mt-4"
                mode={ButtonMode.Primary}
                disabled={!shareName}
                onClick={onClickShare}
              >
                Begin Sharing
              </Button>
              <LinkButton
                to={`/${event.sku}/join`}
                className="mt-4 w-full text-center"
              >
                Join Share
              </LinkButton>
            </div>
          )}
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
