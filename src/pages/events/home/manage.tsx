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
import {
  ArrowRightIcon,
  FlagIcon,
  UserCircleIcon,
} from "@heroicons/react/20/solid";
import { Dialog, DialogBody } from "~components/Dialog";
import { Input } from "~components/Input";
import { QRCode } from "~components/QRCode";
import { EyeIcon } from "@heroicons/react/24/outline";
import { twMerge } from "tailwind-merge";

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

  const [showShareCode, setShowShareCode] = useState(false);

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

    const response = await beginSharing({
      owner: { id: shareId, name: shareName ?? "" },
      sku: event.sku,
    });

    if (response.success) {
      toast({ type: "info", message: "Sharing Enabled" });
    } else {
      toast({ type: "error", message: response.details });
    }
  }, [beginSharing, event.sku, shareName]);

  const joinURL = useMemo(
    () => new URL(`/${event.sku}/join?code=${shareCode}`, location.href),
    [shareCode]
  );

  const onClickShareQR = useCallback(async () => {
    const shareData = {
      url: joinURL.href,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      navigator.share(shareData);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(joinURL.href);
      toast({ type: "info", message: "Copied to Clipboard!" });
    }
  }, [shareCode, event.sku, joinURL]);

  const onClickShareCode = useCallback(async () => {
    if (navigator.clipboard && shareCode) {
      navigator.clipboard.writeText(shareCode);
      toast({ type: "info", message: "Copied to Clipboard!" });
    }
  }, [shareCode, event.sku, joinURL]);

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
    <section className="max-w-xl mx-auto">
      <section className="mt-4">
        <h2 className="font-bold">Share Event Data</h2>
        <Spinner show={isPendingShare} />
        {isSharing ? (
          <section>
            <p>Allow others to join by using the QR Code below.</p>
            <p className="mt-4">Share Name: {shareName}</p>

            <div className="overflow-hidden rounded-md relative">
              <QRCode
                config={{ text: joinURL.href }}
                className={twMerge(
                  "mt-2",
                  showShareCode ? "blur-none" : "blur-xl"
                )}
                onClick={onClickShareQR}
              />
              {!showShareCode ? (
                <section className="absolute top-0 left-0 right-0 bottom-0 p-4 flex items-center">
                  <Button
                    className="bg-transparent flex justify-center"
                    onClick={() => setShowShareCode(true)}
                  >
                    <EyeIcon height={24} />
                    <span className="ml-2">Reveal QR Code</span>
                  </Button>
                </section>
              ) : null}
            </div>
            <Button
              className="w-full font-mono text-4xl mt-4 text-center"
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
            <section className="mt-4">
              <h2 className="font-bold">Active Users</h2>
              <ul>
                {activeUsers.map((u) => (
                  <li key={u} className="ml-6 list-disc">
                    {u}
                  </li>
                ))}
              </ul>
            </section>
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
              mode="primary"
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
