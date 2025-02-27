import { useCallback, useEffect, useMemo, useState } from "react";
import { EventData } from "robotevents";
import { Button, IconButton, LinkButton } from "~components/Button";
import {
  acceptEventInvitation,
  fetchInvitation,
  forceEventInvitationSync,
  getInstancesForEvent,
  getIntegrationAPIEndpoints,
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
  useSystemKeyIntegrationBearer,
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

  const user = useMemo(
    () => (response?.success ? response.data.user : null),
    [response]
  );
  const userVersion = useMemo(
    () => (response?.success ? response.data.version : null),
    [response]
  );

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
    <Dialog open={open} onClose={onClose} mode="modal" aria-label="Invite User">
      <DialogHeader onClose={onClose} title="Invite User" />
      <DialogBody className="px-2">
        <label>
          <h1 className="font-bold">Invite Code</h1>
          <p>
            To invite a user to this share instance, enter their invite code.
          </p>
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
            <p>{user.name}</p>
            <ClickToCopy message={user.key} />
            {userVersion !== __REFEREE_FYI_VERSION__ ? (
              <Warning
                message="User is on a different version"
                className="mt-4"
              >
                <p>
                  Your app version (<code>{__REFEREE_FYI_VERSION__}</code>) does
                  not match this user's app version (
                  <code>{userVersion ?? "Unknown"}</code>
                  ). This can lead to instability.
                </p>
              </Warning>
            ) : null}
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

  useEffect(() => {
    if (!name || !open) {
      return;
    }
    registerUser({ name });
  }, [name, open]);

  // Invitation
  const { data: invitation } = useQuery({
    queryKey: ["join_custom_get_invite"],
    queryFn: () => fetchInvitation(sku),
    refetchInterval: 2000,
    networkMode: "always",
    enabled: open,
  });

  const { mutate: setNameContinue, isPending: isPendingSetNameContinue } =
    useMutation({
      mutationFn: async () => {
        const profile = { name: localName };
        await persist(profile);
        await registerUser(profile);
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
            {invitation?.data ? (
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

export const LeaveDialog: React.FC<ManageDialogProps> = ({
  open,
  onClose,
  sku,
}) => {
  const { data: invitation } = useEventInvitation(sku);

  const { forceSync, disconnect, invitations } = useShareConnection([
    "forceSync",
    "disconnect",
    "invitations",
  ]);

  const { mutateAsync: onClickLeave } = useMutation({
    mutationFn: async () => {
      await disconnect();
      await removeInvitation(sku);
      queryClient.invalidateQueries({ queryKey: ["event_invitation_all"] });
      onClose();
      forceSync();
    },
  });

  return (
    <Dialog
      mode="modal"
      open={open}
      className="p-4"
      onClose={onClose}
      aria-label="Leave share instance"
    >
      <DialogBody>
        <p>
          Are you sure? If you leave, you will need an admin to invite you
          again.
        </p>
        {invitation?.admin && invitations.filter((i) => i.admin).length < 2 ? (
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
        <Button mode="normal" className="mt-4" onClick={onClose}>
          Stay
        </Button>
      </DialogBody>
    </Dialog>
  );
};

export const ProfilePrompt: React.FC = () => {
  const { name, persist } = useShareProfile();

  // Local
  const [localName, setLocalName] = useState(name);

  // Save
  const { mutateAsync: register } = useMutation({ mutationFn: registerUser });
  const { mutate: setNameContinue, isPending: isPendingSetNameContinue } =
    useMutation({
      mutationFn: async () => {
        const profile = { name: localName };
        await persist(profile);
        await register(profile);
      },
    });

  return (
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
          onChange={(e) => setLocalName(e.currentTarget.value.trim())}
        />
      </label>
      <Button
        className={twMerge("mt-4", !localName ? "opacity-50" : "")}
        mode="primary"
        onClick={() => setNameContinue()}
        disabled={!localName}
      >
        Continue
      </Button>
      <Spinner show={isPendingSetNameContinue} />
    </>
  );
};

export const ShareManager: React.FC<ManageTabProps> = ({ event }) => {
  const { name, key } = useShareProfile();

  // Dialogs
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [joinCodeDialogOpen, setJoinCodeDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  // Instance State
  const { data: invitation } = useEventInvitation(event.sku);
  const connection = useShareConnection([
    "invitations",
    "activeUsers",
    "readyState",
    "forceSync",
    "disconnect",
  ]);

  // If we are not in the instance, force an invalidation
  useEffect(() => {
    if (!invitation?.accepted) {
      return;
    }

    const instanceInList = connection.invitations.some(
      (inv) => inv.user.key === key
    );

    if (!instanceInList) {
      forceEventInvitationSync(event.sku);
    }
  }, [invitation, connection.invitations, key, event.sku]);

  const { data: entries } = useEventIncidents(event.sku);
  const isSharing = useMemo(
    () => !!invitation && invitation.accepted,
    [invitation]
  );

  // Remove User
  const { mutateAsync: removeUser, isPending: isPendingRemoveUser } =
    useMutation({
      mutationFn: async (user: string) => {
        await removeInvitation(event.sku, user);
        queryClient.invalidateQueries({ queryKey: ["event_invitation_all"] });
        return connection.forceSync();
      },
    });

  // Begin Sharing
  const { mutateAsync: createInstance } = useCreateInstance(event.sku);
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

  if (!name) {
    return (
      <section>
        <h2 className="font-bold">Sharing</h2>
        <ProfilePrompt />
      </section>
    );
  }

  const showSpinner =
    (connection.readyState !== ReadyState.Closed &&
      connection.readyState !== ReadyState.Open) ||
    isPendingRemoveUser ||
    isCreateInstancePending ||
    (invitation?.accepted && connection.readyState !== ReadyState.Open);

  return (
    <section>
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
      <LeaveDialog
        sku={event.sku}
        open={leaveDialogOpen}
        onClose={() => setLeaveDialogOpen(false)}
      />

      <h2 className="font-bold">Sharing</h2>
      <p>Share Name: {name} </p>
      {isSharing ? (
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
                {connection.activeUsers.length} active
              </span>
            </p>
          </nav>
          <Spinner show={showSpinner} />
          <ul className="mt-4">
            {connection.invitations.map((user) => (
              <li
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
                  {connection.activeUsers.find(
                    (u) => u.key === user.user.key
                  ) ? (
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
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!isSharing ? (
        <section>
          <p>
            Create or join a sharing instance to synchronize the anomaly log
            between devices.
          </p>
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
          <Spinner show={showSpinner} />
        </section>
      ) : null}
    </section>
  );
};

const EventSummaryLink: React.FC<ManageTabProps> = ({ event }) => {
  return (
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
  );
};

const IntegrationInfo: React.FC<ManageTabProps> = ({ event }) => {
  const { data: bearerToken, isSuccess: isSuccessBearerToken } =
    useIntegrationBearer(event.sku);

  const { json, csv, pdf } = useMemo(() => {
    if (!bearerToken) {
      return { json: "", csv: "", pdf: "" };
    }
    return getIntegrationAPIEndpoints(event.sku, { token: bearerToken });
  }, [bearerToken, event.sku]);

  if (!isSuccessBearerToken || !bearerToken) {
    return null;
  }

  return (
    <section>
      <h2 className="mt-4 font-bold">Integrations</h2>
      <p>
        Use these integration URLs to give others up-to-date read-only access to
        the anomaly log for this instance.{" "}
        <em>
          Anyone who has this URL can pull this data at any time, so treat these
          carefully!
        </em>
      </p>
      <ClickToCopy prefix="JSON" message={json.toString()} className="flex-1" />
      <ClickToCopy prefix="CSV" message={csv.toString()} className="flex-1" />
      <ClickToCopy prefix="PDF" message={pdf.toString()} className="flex-1" />
    </section>
  );
};

type SystemKeyIntegrationInfoProps = ManageTabProps & {
  instance: string;
};

const SystemKeyIntegrationInfo: React.FC<SystemKeyIntegrationInfoProps> = ({
  event,
  instance,
}) => {
  const { data: bearerToken } = useSystemKeyIntegrationBearer(
    event.sku,
    instance
  );

  const { json, csv, pdf } = useMemo(() => {
    if (!bearerToken) {
      return { json: "", csv: "", pdf: "" };
    }
    return getIntegrationAPIEndpoints(event.sku, {
      token: bearerToken,
      instance,
    });
  }, [bearerToken, event.sku, instance]);

  return (
    <div className="mt-4">
      <ClickToCopy prefix="INSTANCE" message={instance} className="flex-1" />
      <ClickToCopy prefix="JSON" message={json.toString()} className="flex-1" />
      <ClickToCopy prefix="CSV" message={csv.toString()} className="flex-1" />
      <ClickToCopy prefix="PDF" message={pdf.toString()} className="flex-1" />
    </div>
  );
};

const SystemKeyInfo: React.FC<ManageTabProps> = ({ event }) => {
  const { isSystemKey } = useShareProfile();

  const { data: response, isLoading } = useQuery({
    queryKey: ["@referee-fyi", "get_instance_list", event.sku],
    queryFn: () => getInstancesForEvent(event.sku),
    enabled: isSystemKey,
  });

  const instances = useMemo(() => {
    return response?.success ? response.data.instances : [];
  }, [response]);

  if (!isSystemKey) {
    return null;
  }

  if (isLoading) {
    return <Spinner show />;
  }

  return (
    <section>
      <h2 className="mt-4 font-bold">Instance List</h2>
      {instances.map((instance) => (
        <SystemKeyIntegrationInfo
          key={instance}
          event={event}
          instance={instance}
        />
      ))}
    </section>
  );
};

export type ManageTabProps = {
  event: EventData;
};

export const EventManageTab: React.FC<ManageTabProps> = ({ event }) => {
  return (
    <section className="max-w-xl max-h-full w-full mx-auto flex-1 mb-12 overflow-y-auto">
      <UpdatePrompt />
      <ShareManager event={event} />
      <EventSummaryLink event={event} />
      <IntegrationInfo event={event} />
      <SystemKeyInfo event={event} />
    </section>
  );
};
