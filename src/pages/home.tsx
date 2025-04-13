import { Button, LinkButton } from "~components/Button";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogHeader, DialogBody } from "~components/Dialog";
import Markdown from "react-markdown";

import {
  Cog8ToothIcon,
  GlobeAmericasIcon,
  UserGroupIcon,
} from "@heroicons/react/20/solid";
import { useEventSearch } from "~utils/hooks/robotevents";
import { useRecentEvents } from "~utils/hooks/history";
import { isWorldsBuild } from "~utils/data/state";
import { useQuery } from "@tanstack/react-query";
import { getEventInvitation } from "~utils/data/share";
import { ClickToCopy } from "~components/ClickToCopy";
import { UpdatePrompt } from "~components/UpdatePrompt";
import { useDisplayMode, useInstallPrompt } from "~utils/hooks/pwa";

import AppIcon from "/icons/referee-fyi.svg?url";
import UpdateNotes from "/updateNotes.md?url";

import "./markdown.css";

// TODO: We probably should rely on a different signal to determine if we should display the update notes.
import { version } from "../../package.json";

const UserWelcome: React.FC = () => {
  return (
    <section className="mt-4 bg-zinc-900 p-4 rounded-md">
      <h2 className="font-bold">Getting Started</h2>
      <p>
        Referee FYI is a digital anomaly log for robotics events. To get
        started, pick your event from the dropdown above.
      </p>
    </section>
  );
};

const InstallPrompt: React.FC = () => {
  const mode = useDisplayMode();
  const prompt = useInstallPrompt();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const value = localStorage.getItem("meta#installPromptHidden");
    if (value === "true") {
      setHidden(true);
    } else {
      setHidden(false);
    }
  }, []);

  const shouldPrompt = useMemo(() => {
    if (hidden) {
      return false;
    }

    if (mode === "standalone") {
      return false;
    }

    return prompt !== null;
  }, [hidden, mode, prompt]);

  const onClickInstall = useCallback(() => {
    if (prompt) {
      prompt.prompt();
    }
  }, [prompt]);

  const onClickDismiss = useCallback(() => {
    setHidden(true);
    localStorage.setItem("meta#installPromptHidden", "true");
  }, []);

  if (!shouldPrompt) {
    return null;
  }

  return (
    <section className="mt-4 bg-zinc-900 p-4 rounded-md">
      <header className="flex gap-4 items-center">
        <img src={AppIcon} alt="Referee FYI" className="w-12 h-12" />
        <p>
          For a better experience, consider adding Referee FYI to your home
          screen.
        </p>
      </header>
      <nav className="flex items-end justify-center mt-4 gap-2">
        <Button mode="primary" onClick={onClickInstall}>
          Install
        </Button>
        <Button mode="normal" onClick={onClickDismiss}>
          Dismiss
        </Button>
      </nav>
    </section>
  );
};

function useHomeEvents() {
  const { data: worldsEvents } = useEventSearch(
    {
      "sku[]": [
        "RE-V5RC-24-8909",
        "RE-V5RC-24-8910",
        "RE-VURC-24-8911",
        "RE-VIQRC-24-8913",
        "RE-VIQRC-24-8914",
      ],
    },
    { enabled: isWorldsBuild() }
  );

  const { data: recentUser } = useRecentEvents(5);

  return isWorldsBuild() ? worldsEvents : recentUser;
}

function useUpdateNotes() {
  return useQuery({
    queryKey: ["update_notes"],
    queryFn: async () => {
      const response = await fetch(UpdateNotes);
      return response.text();
    },
  });
}

export const HomePage: React.FC = () => {
  const events = useHomeEvents();
  const { data: eventsInvitations } = useQuery({
    queryKey: ["event_invitations", events],
    queryFn: () =>
      Promise.all(events?.map((event) => getEventInvitation(event.sku)) ?? []),
  });

  const { data: markdownContent, isSuccess: isFetchedUpdateNotesSuccess } =
    useUpdateNotes();
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  useEffect(() => {
    if (!isFetchedUpdateNotesSuccess) {
      return;
    }

    const userVersion = localStorage.getItem("version");

    if (userVersion && userVersion !== version) {
      setUpdateDialogOpen(true);
    }

    localStorage.setItem("version", version);
  }, [isFetchedUpdateNotesSuccess]);

  return (
    <>
      <div>
        <nav className="flex items-center gap-4 mt-4">
          <div className="flex-1">
            <Button
              mode="primary"
              className="text-right w-max"
              onClick={() => setUpdateDialogOpen(true)}
            >
              Update Notes
            </Button>
          </div>
          {isWorldsBuild() ? (
            <p className="bg-purple-600 text-zinc-300 p-2 rounded-md flex items-center gap-2">
              <GlobeAmericasIcon height={20} />
              Worlds
              <span className="flex-1 text-right font-mono">
                {__REFEREE_FYI_VERSION__}
              </span>
            </p>
          ) : null}
          <LinkButton to="/settings" className="flex items-center gap-2">
            <Cog8ToothIcon height={20} />
            <p>Settings</p>
          </LinkButton>
        </nav>
        <UpdatePrompt />
        <section className="max-w-full mb-4">
          {events?.map((event) => (
            <LinkButton
              to={`/${event.sku}`}
              className="w-full max-w-full mt-4 relative"
              key={event.sku}
            >
              <div className="text-sm flex">
                <p className="text-emerald-400 font-mono flex-1">{event.sku}</p>
                {eventsInvitations?.find((inv) => inv?.sku === event.sku) ? (
                  <UserGroupIcon height={20} />
                ) : null}
              </div>
              <p>{event.name}</p>
            </LinkButton>
          ))}
          {events?.length === 0 ? <UserWelcome /> : null}
          <InstallPrompt />
        </section>
      </div>
      <Dialog
        open={updateDialogOpen}
        mode="modal"
        onClose={() => setUpdateDialogOpen(false)}
        aria-label="What's New with Referee FYI"
      >
        <DialogHeader
          title="What's New"
          onClose={() => setUpdateDialogOpen(false)}
        />
        <DialogBody className="markdown">
          <section className="m-4 mt-0 ">
            <p>Build Version</p>
            <ClickToCopy message={__REFEREE_FYI_VERSION__} />
          </section>
          <Markdown className="p-4 pt-0">{markdownContent}</Markdown>
        </DialogBody>
      </Dialog>
    </>
  );
};

export default HomePage;
