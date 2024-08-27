import { useCallback, useEffect, useMemo, useState } from "react";
import { EventData } from "robotevents";
import { Button, IconButton, LinkButton } from "~components/Button";
import { deleteManyIncidents, getIncidentsByEvent } from "~utils/data/incident";
import {
  acceptEventInvitation,
  fetchInvitation,
  getRequestCodeUserKey,
  inviteUser,
  putRequestCode,
  registerUser,
  removeInvitation,
} from "~utils/data/share";
import {
  ArrowRightIcon,
  FlagIcon,
  UserCircleIcon,
  UserPlusIcon,
} from "@heroicons/react/20/solid";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import {
  useCreateInstance,
  useEventInvitation,
  useIntegrationBearer,
  useShareProfile,
} from "~utils/hooks/share";
import { Checkbox, Input } from "~components/Input";
import { toast } from "~components/Toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Error, Info, Success, Warning } from "~components/Warning";
import { Spinner } from "~components/Spinner";
import { useEventIncidents } from "~utils/hooks/incident";
import { TrashIcon } from "@heroicons/react/24/outline";
import { queryClient } from "~utils/data/query";
import { ReadyState, useShareConnection } from "~models/ShareConnection";
import { isWorldsBuild } from "~utils/data/state";
import { ClickToCopy } from "~components/ClickToCopy";
import { twMerge } from "tailwind-merge";
import { tryPersistStorage } from "~utils/data/keyval";
import { UpdatePrompt } from "~components/UpdatePrompt";

export type ManageDialogProps = {
  open: boolean;
  onClose: () => void;
  sku: string;
};

export const InviteDialog: React.FC<ManageDialogProps> = ({
  open,
  onClose,
  sku,
}) => {
  const [inviteCode, setInviteCode] = useState("");
  const [admin, setAdmin] = useState(false);

  const {
    data: response,
    isLoading: isLoadingRequestCode,
    isPending: isGetInvitePending,
  } = useQuery({
    queryKey: ["get_invite", sku, inviteCode],
    queryFn: () => getRequestCodeUserKey(sku, inviteCode),
    enabled: inviteCode.length > 0,
  });

  const user = useMemo(() => {
    return response?.success ? response.data.user : null;
  }, [response]);

  const {
    mutateAsync: invite,
    isPending: isInvitePending,
    isError: isInviteError,
    isSuccess: isInviteSuccess,
    error: inviteError,
    reset: resetInvite,
  } = useMutation({
    mutationFn: (key: string) => inviteUser(sku, key, { admin }),
  });

  useEffect(() => {
    if (isInviteSuccess) {
      setTimeout(() => {
        if (isInviteSuccess) {
          setInviteCode("");
          setAdmin(false);
          resetInvite();
        }
      }, 2000);
    }
  }, [resetInvite, isInviteSuccess]);

  return (
    <Dialog open={open} onClose={onClose} mode="modal">
      <DialogHeader onClose={onClose} title="Invite User" />
      <DialogBody className="px-2">
        <label>
          <h1 className="font-bold">Invite Code</h1>
          <div className="relative">
            <Input
              className={twMerge("w-full font-mono text-6xl text-center")}
              value={inviteCode}
              onChange={(e) =>
                setInviteCode(e.currentTarget.value.toUpperCase())
              }
            />
          </div>
        </label>
        <Spinner show={isLoadingRequestCode} />
        {user ? (
          <div className="mt-4">
            <Info message={user.name} className="bg-zinc-700" />
            <ClickToCopy message={user.key} />
            <Checkbox
              label="Invite as Admin"
              bind={{ value: admin, onChange: setAdmin }}
            />
            <Button
              mode="primary"
              className="mt-4"
              onClick={() => invite(user.key)}
            >
              Invite {user.name}
            </Button>
          </div>
        ) : null}
        {!user && !isGetInvitePending ? (
          <Error message="Invalid Code" className="mt-4" />
        ) : null}
        <Spinner show={isInvitePending} className="mt-4" />
        {isInviteError ? (
          <Error message={inviteError.message} className="mt-4" />
        ) : null}
        {isInviteSuccess ? (
          <Success message="Sent Invitation!" className="mt-4 bg-emerald-600" />
        ) : null}
      </DialogBody>
    </Dialog>
  );
};

export const JoinCodeDialog: React.FC<ManageDialogProps> = ({
  open,
  onClose,
  sku,
}) => {
  // Request Code
  const { data: requestCode, isLoading: isLoadingRequestCode } = useQuery({
    queryKey: ["request_code", sku],
    queryFn: () => putRequestCode(sku),
    enabled: open,
    gcTime: 600000,
    refetchInterval: 60000,
  });

  const code = useMemo(() => {
    return requestCode?.success ? requestCode.data.code : "";
  }, [requestCode]);

  // Register user when they open
  const { name, persist } = useShareProfile();
  const [localName, setLocalName] = useState(name);
  const { mutateAsync: register } = useMutation({ mutationFn: registerUser });
  useEffect(() => {
    if (!name || !open) {
      return;
    }

    register({ name });
  }, [name, open, register]);

  // Invitation
  const [hasInvitation, setHasInvitation] = useState(false);

  const { data: invitation } = useQuery({
    queryKey: ["join_custom_get_invite"],
    queryFn: () => fetchInvitation(sku),
    refetchInterval: 2000,
    networkMode: "always",
    enabled: open && !hasInvitation,
  });

  useEffect(() => {
    if (invitation?.success && invitation.data) {
      setHasInvitation(true);
    } else {
      setHasInvitation(false);
    }
  }, [invitation]);

  const { mutate: setNameContinue, isPending: isPendingSetNameContinue } =
    useMutation({
      mutationFn: async () => {
        const profile = { name: localName };
        await persist(profile);
        await register(profile);
      },
    });

  const onAcceptInvitation = useCallback(async () => {
    if (!invitation || !invitation.success) {
      return;
    }
    await tryPersistStorage();
    await acceptEventInvitation(sku, invitation.data.id);
    onClose();
  }, [invitation, sku, onClose]);

  const onClearInvitation = useCallback(async () => {
    await removeInvitation(sku);
    setHasInvitation(false);
  }, [sku]);

  return (
    <Dialog open={open} onClose={onClose} mode="modal">
      <DialogHeader onClose={onClose} title="Join Request" />
      <DialogBody className="px-2">
        {!name ? (
          <>
            <p>
              Enter your name to continue. This name will be visible to other
              participants.
            </p>
            <label>
              <h1 className="font-bold mt-4">Name</h1>
              <Input
                className="w-full"
                value={localName}
                onChange={(e) => setLocalName(e.currentTarget.value)}
              />
            </label>
            <Button
              className={twMerge("mt-4", !localName ? "opacity-50" : "")}
              mode="primary"
              onClick={() => setNameContinue()}
            >
              Continue
            </Button>
            <Spinner show={isPendingSetNameContinue} />
          </>
        ) : null}
        {name ? (
          <>
            <p className="mb-4">
              To join an existing instance, you will need an admin to invite
              you. Have them enter the code shown below on their device.
            </p>
            <Spinner show={isLoadingRequestCode} />
            <ClickToCopy
              message={code}
              className="font-mono text-6xl text-center"
            />
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
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [joinCodeDialogOpen, setJoinCodeDialogOpen] = useState(false);

  const { name, persist } = useShareProfile();
  const [localName, setLocalName] = useState(name);

  const { mutateAsync: createInstance } = useCreateInstance(event.sku);
  const { data: invitation } = useEventInvitation(event.sku);

  const invitations = useShareConnection((c) => c.invitations);
  const activeUsers = useShareConnection((c) => c.activeUsers);
  const forceSync = useShareConnection((c) => c.forceSync);

  const connectionStatus = useShareConnection((c) => c.readyState);

  const { data: entries } = useEventIncidents(event.sku);
  const isSharing = useMemo(
    () => !!invitation && invitation.accepted,
    [invitation]
  );

  const { data: bearerToken, isSuccess: isSuccessBearerToken } =
    useIntegrationBearer(event.sku);

  const { jsonEndpoint, csvEndpoint } = useMemo(() => {
    if (!bearerToken) {
      return { jsonEndpoint: "", csvEndpoint: "" };
    }

    const json = new URL(
      `/api/integration/v1/${event.sku}/incidents.json`,
      import.meta.env.VITE_REFEREE_FYI_SHARE_SERVER
    );

    const csv = new URL(
      `/api/integration/v1/${event.sku}/incidents.csv`,
      import.meta.env.VITE_REFEREE_FYI_SHARE_SERVER
    );

    json.searchParams.set("token", bearerToken);
    csv.searchParams.set("token", bearerToken);

    return { jsonEndpoint: json.toString(), csvEndpoint: csv.toString() };
  }, [bearerToken, event.sku]);

  const {
    mutateAsync: onClickBeginSharing,
    isPending: isCreateInstancePending,
  } = useMutation({
    mutationFn: async () => {
      await tryPersistStorage();
      await registerUser({ name });
      const response = await createInstance();

      if (response.success) {
        toast({ type: "info", message: "Sharing!" });
      } else {
        toast({
          type: "error",
          message: response.details,
          context: JSON.stringify(response),
        });
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
      forceSync();
    },
  });

  const { mutateAsync: removeUser } = useMutation({
    mutationFn: async (user: string) => {
      await removeInvitation(event.sku, user);
      queryClient.invalidateQueries({ queryKey: ["event_invitation_all"] });
      forceSync();
    },
  });

  const onConfirmDeleteData = useCallback(async () => {
    const incidents = await getIncidentsByEvent(event.sku);
    await removeInvitation(event.sku);
    await deleteManyIncidents(incidents.map((i) => i.id));
    setDeleteDataDialogOpen(false);
  }, [event.sku]);

  return (
    <section className="max-w-xl max-h-full w-full mx-auto flex-1 mb-4 overflow-y-auto">
      <JoinCodeDialog
        sku={event.sku}
        open={joinCodeDialogOpen}
        onClose={() => setJoinCodeDialogOpen(false)}
      />
      <InviteDialog
        sku={event.sku}
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
      />
      <UpdatePrompt />
      <Spinner show={isCreateInstancePending || isLeavePending} />
      {isSharing ? (
        <section className="mt-4">
          <h2 className="font-bold">Sharing</h2>
          <p>Share Name: {name} </p>
          <div className="mt-2">
            {invitation?.admin ? (
              <Button
                mode="normal"
                className="flex gap-2 items-center justify-center"
                onClick={() => setInviteDialogOpen(true)}
              >
                <UserPlusIcon height={20} />
                <p>Invite</p>
              </Button>
            ) : null}
            <Dialog
              mode="modal"
              open={leaveDialogOpen}
              className="p-4"
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
                  {activeUsers.find((u) => u.key === user.user.key) ? (
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
              value={localName}
              onChange={(e) => setLocalName(e.currentTarget.value)}
              onBlur={() => persist({ name: localName })}
            />
          </section>
          <Button
            mode="primary"
            className="mt-2"
            disabled={!name}
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
            mode="modal"
            className="absolute w-full rounded-md mt-4"
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
      {isSuccessBearerToken && bearerToken ? (
        <section>
          <h2 className="mt-4 font-bold">Integration Bearer</h2>
          <p>
            Use this bearer token to allow external integrations to read data
            from this instance.
          </p>
          <ClickToCopy message={bearerToken ?? ""} />
          <ClickToCopy prefix="JSON" message={jsonEndpoint} />
          <ClickToCopy prefix="CSV" message={csvEndpoint} className="flex-1" />
        </section>
      ) : null}
    </section>
  );
};
