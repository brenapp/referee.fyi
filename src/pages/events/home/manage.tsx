import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EventData } from "robotevents/out/endpoints/events";
import {
  Button,
  ButtonProps,
  IconButton,
  LinkButton,
} from "~components/Button";
import { deleteIncident, getIncidentsByEvent } from "~utils/data/incident";
import {
  acceptEventInvitation,
  fetchInvitation,
  getJoinRequest,
  inviteUser,
  isValidJoinRequest,
  JoinRequest,
  registerUser,
  removeInvitation,
} from "~utils/data/share";
import {
  ArrowRightIcon,
  DocumentDuplicateIcon,
  FlagIcon,
  UserCircleIcon,
  UserPlusIcon,
} from "@heroicons/react/20/solid";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import {
  useCreateInstance,
  useEventInvitation,
  useShareID,
  useShareProfile,
} from "~utils/hooks/share";
import { Input } from "~components/Input";
import { toast } from "~components/Toast";
import { QRCode, QRCodeProps } from "~components/QRCode";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Info, Error, Warning } from "~components/Warning";
import { Spinner } from "~components/Spinner";
import { useEventIncidents } from "~utils/hooks/incident";
import { TrashIcon } from "@heroicons/react/24/outline";
import { queryClient } from "~utils/data/query";
import { ReadyState, useShareConnection } from "~models/ShareConnection";
import { isWorldsBuild } from "~utils/data/state";

export const InviteDialog: React.FC<ButtonProps & { sku: string }> = ({
  sku,
  ...props
}) => {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");

  const [info, setInfo] = useState<JoinRequest | null>(null);

  const [publicKeyValue, setPublicKeyValue] = useState("");

  const onInviteButtonClick = useCallback(async () => {
    setOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      setStream(stream);
    } catch (e) {
      setError(`Cannot access camera! ${e}`);
    }
  }, []);

  useEffect(() => {
    if (
      !videoRef.current ||
      !stream ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      !window.BarcodeDetector
    ) {
      return;
    }
    videoRef.current.srcObject = stream;
    videoRef.current.play();

    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const onLoadedMetadata = async () => {
      if (!videoRef.current) return;
      const canvas = document.createElement("canvas");

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext("2d");

      const searchLoop = async () => {
        if (!videoRef.current) return;
        context?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        const barcodes = await detector.detect(canvas);
        for (const code of barcodes) {
          try {
            const value = JSON.parse(code.rawValue);
            if (isValidJoinRequest(value)) {
              setPublicKeyValue(value.user.key);
              setInfo(value);
            }
          } catch (e) {
            continue;
          }
        }

        requestAnimationFrame(searchLoop);
      };

      searchLoop();
    };

    const video = videoRef.current;

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => video?.removeEventListener("loadedmetadata", onLoadedMetadata);
  }, [stream, videoRef]);

  const { mutateAsync: invite, isPending: isInvitePending } = useMutation({
    mutationFn: async () => {
      const result = await inviteUser(sku, publicKeyValue);

      if (!result.success) {
        setError(result.details);
      }

      setInfo(null);
      setPublicKeyValue("");
    },
    onError: (e) => setError(e.message),
  });

  useEffect(() => {
    if (open) {
      return;
    }
    stream?.getTracks().forEach((t) => t.stop());
  }, [open, stream]);

  return (
    <>
      <Button
        mode="normal"
        className="flex gap-2 items-center justify-center"
        onClick={onInviteButtonClick}
        {...props}
      >
        <UserPlusIcon height={20} />
        <p>Invite</p>
      </Button>
      <Dialog open={open} mode="modal" onClose={() => setOpen(false)}>
        <DialogHeader title="Invite User" onClose={() => setOpen(false)} />
        <DialogBody>
          {error ? <Error message={error} /> : null}
          <section className="mt-4">
            <h2>Public Key</h2>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                value={publicKeyValue}
                onChange={(e) => setPublicKeyValue(e.currentTarget.value)}
              />
              <Button
                mode="primary"
                className="w-max flex items-center gap-2"
                onClick={() => invite()}
                disabled={isInvitePending}
              >
                <UserPlusIcon height={20} />
                <p>Invite User</p>
              </Button>
            </div>
          </section>
          <video ref={videoRef} className="w-full rounded-md mt-4"></video>
          {info && !isInvitePending ? (
            <Button
              mode="primary"
              className="w-max flex items-center gap-2"
              onClick={() => invite()}
            >
              <UserPlusIcon height={20} />
              <p>Invite {info.user.name}</p>
            </Button>
          ) : null}
        </DialogBody>
      </Dialog>
    </>
  );
};

export type JoinCodeDialogProps = {
  open: boolean;
  onClose: () => void;
  sku: string;
};

export const JoinCodeDialog: React.FC<JoinCodeDialogProps> = ({
  open,
  onClose,
  sku,
}) => {
  const { name } = useShareProfile();
  const { data: key, isSuccess } = useShareID();

  const [hasInvitation, setHasInvitation] = useState(false);

  const { data: invitation } = useQuery({
    queryKey: ["join_custom_get_invite"],
    queryFn: () => fetchInvitation(sku),
    refetchInterval: 5000,
    networkMode: "always",
    enabled: open && !hasInvitation,
  });

  // Register user when they open
  const { mutateAsync: register } = useMutation({ mutationFn: registerUser });
  useEffect(() => {
    if (!name || !open) {
      return;
    }

    register(name);
  }, [name, open, register]);

  useEffect(() => {
    if (invitation?.success && invitation.data) {
      setHasInvitation(true);
    } else {
      setHasInvitation(false);
    }
  }, [invitation]);

  const onAcceptInvitation = useCallback(async () => {
    if (!invitation || !invitation.success) {
      return;
    }
    await acceptEventInvitation(sku, invitation.data.id);
    onClose();
  }, [invitation, sku, onClose]);

  const onClearInvitation = useCallback(async () => {
    await removeInvitation(sku);
    setHasInvitation(false);
  }, [sku]);

  const config: QRCodeProps["config"] | null = useMemo(() => {
    if (!isSuccess) {
      return null;
    }
    const joinRequest = getJoinRequest({ name, id: key });
    const payload = JSON.stringify(joinRequest);
    return { text: payload };
  }, [name, key, isSuccess]);

  const onClickCopyKey = useCallback(() => {
    if (key) {
      navigator.clipboard.writeText(key);
    }
  }, [key]);

  return (
    <Dialog open={open} onClose={onClose} mode="modal">
      <DialogHeader onClose={onClose} title="Join Request" />
      <DialogBody className="px-2">
        {config ? (
          <>
            <p>Copy the public key below and send to owner.</p>
            <div className="mt-2 flex gap-2 w-full">
              <IconButton
                className="p-3"
                onClick={onClickCopyKey}
                icon={<DocumentDuplicateIcon height={20} />}
              />
              <div className="p-3 px-4 text-ellipsis overflow-hidden bg-zinc-700 rounded-md flex-1">
                {key}
              </div>
            </div>
            <QRCode config={config} className="mt-4" />
            {hasInvitation ? (
              <section className="mt-4">
                <nav className="flex justify-between items-center">
                  <Info
                    message={`Invitation From ${invitation?.data.from.name}`}
                  />
                  {invitation?.data.admin ? (
                    <p className="text-sm text-emerald-400">Admin</p>
                  ) : null}
                </nav>
                <Button
                  mode="primary"
                  className="mt-2"
                  onClick={onAcceptInvitation}
                >
                  Accept & Join
                </Button>
                <Button
                  mode="dangerous"
                  className="mt-2"
                  onClick={onClearInvitation}
                >
                  Clear Invitation
                </Button>
              </section>
            ) : (
              <Spinner className="mt-4" show />
            )}
          </>
        ) : null}
      </DialogBody>
    </Dialog>
  );
};

export type ManageTabProps = {
  event: EventData;
};

export const EventManageTab: React.FC<ManageTabProps> = ({ event }) => {
  const [deleteDataDialogOpen, setDeleteDataDialogOpen] = useState(false);
  const [joinCodeDialogOpen, setJoinCodeDialogOpen] = useState(false);

  const { name, setName, persist } = useShareProfile();

  const { mutateAsync: createInstance } = useCreateInstance(event.sku);
  const { data: invitation } = useEventInvitation(event.sku);

  const invitations = useShareConnection((c) => c.invitations);
  const activeUsers = useShareConnection((c) => c.activeUsers);

  const connectionStatus = useShareConnection((c) => c.readyState);

  const { data: entries } = useEventIncidents(event.sku);
  const isSharing = useMemo(
    () => !!invitation && invitation.accepted,
    [invitation]
  );

  const {
    mutateAsync: onClickBeginSharing,
    isPending: isCreateInstancePending,
  } = useMutation({
    mutationFn: async () => {
      await registerUser(name);
      const response = await createInstance();

      if (response.success) {
        toast({ type: "info", message: "Sharing!" });
      } else {
        toast({ type: "error", message: response.details });
      }
    },
  });

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const disconnect = useShareConnection((c) => c.disconnect);
  const { mutateAsync: onClickLeave, isPending: isLeavePending } = useMutation({
    mutationFn: async () => {
      await disconnect();
      await removeInvitation(event.sku);
      queryClient.invalidateQueries({ queryKey: ["event_invitation_all"] });
      setLeaveDialogOpen(false);
    },
  });

  const { mutateAsync: removeUser } = useMutation({
    mutationFn: async (user: string) => {
      await removeInvitation(event.sku, user);
      queryClient.invalidateQueries({ queryKey: ["event_invitation_all"] });
    },
  });

  const onConfirmDeleteData = useCallback(async () => {
    const incidents = await getIncidentsByEvent(event.sku);
    await removeInvitation(event.sku);
    for (const incident of incidents) {
      await deleteIncident(incident.id);
    }
    setDeleteDataDialogOpen(false);
  }, [event.sku]);

  return (
    <section className="max-w-xl w-full mx-auto flex-1">
      <JoinCodeDialog
        sku={event.sku}
        open={joinCodeDialogOpen}
        onClose={() => setJoinCodeDialogOpen(false)}
      />
      <Spinner show={isCreateInstancePending || isLeavePending} />
      {isSharing ? (
        <section>
          <h2 className="font-bold">Sharing</h2>
          <p>Share Name: {name} </p>
          <div className="mt-2">
            {invitation?.admin ? <InviteDialog sku={event.sku} /> : null}
            <Dialog
              mode="nonmodal"
              open={leaveDialogOpen}
              className="h-min p-4"
              onClose={() => setLeaveDialogOpen(false)}
            >
              <DialogBody>
                <p>
                  Are you sure? If you leave, you will need an admin to invite
                  you again.
                </p>
                {invitation?.admin &&
                invitations.filter((i) => i.admin).length < 2 ? (
                  <Warning
                    className="mt-4"
                    message="Since you are the last admin, leaving will end this instance and remove all other users."
                  />
                ) : null}
                <Button
                  mode="dangerous"
                  className="mt-4"
                  onClick={() => onClickLeave()}
                >
                  Leave
                </Button>
                <Button
                  mode="normal"
                  className="mt-4"
                  onClick={() => setLeaveDialogOpen(false)}
                >
                  Stay
                </Button>
              </DialogBody>
            </Dialog>
            <Button
              mode="dangerous"
              className="mt-2"
              onClick={() => setLeaveDialogOpen(true)}
            >
              Leave
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
          </div>
          <Spinner
            show={
              connectionStatus === ReadyState.Connecting ||
              connectionStatus === ReadyState.Closing
            }
          />
          <section className="mt-4">
            {invitations.map((user) => (
              <div
                key={user.user.key}
                className="py-2 px-4 rounded-md mt-2 flex"
              >
                <div className="flex gap-2 items-center flex-1">
                  <UserCircleIcon height={24} />
                  <p>{user.user.name}</p>
                  {user.admin ? (
                    <span className="text-xs  bg-purple-600 px-2 py-0.5 rounded-md">
                      Admin
                    </span>
                  ) : null}
                  {activeUsers.find((u) => u.id === user.user.key) ? (
                    <span className="text-xs  bg-emerald-600 px-2 py-0.5 rounded-md">
                      Connected
                    </span>
                  ) : (
                    <span className="text-xs  bg-zinc-700 px-2 py-0.5 rounded-md">
                      Offline
                    </span>
                  )}
                </div>
                {invitation?.admin && !user.admin ? (
                  <IconButton
                    icon={<TrashIcon height={20} />}
                    onClick={() => removeUser(user.user.key)}
                    className="bg-transparent"
                  />
                ) : null}
              </div>
            ))}
          </section>
        </section>
      ) : (
        <section>
          <h2 className="font-bold">Sharing</h2>
          <p>
            Create or join a sharing instance to synchronize the anomaly log
            between devices.
          </p>
          <section className="mt-2">
            <h2 className="font-bold">Name</h2>
            <Input
              className="w-full"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              onBlur={() => persist()}
            />
          </section>
          <Button
            mode="primary"
            className="mt-2"
            onClick={() => onClickBeginSharing()}
          >
            Begin Sharing
          </Button>
          <Button
            mode="normal"
            className="mt-2"
            onClick={() => setJoinCodeDialogOpen(true)}
          >
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
      {!isWorldsBuild() ? (
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
      ) : null}
    </section>
  );
};
