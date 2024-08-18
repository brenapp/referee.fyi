import { Button, LinkButton } from "~components/Button";
import { useEffect, useState } from "react";
import { Dialog, DialogHeader, DialogBody } from "~components/Dialog";
import Markdown from "react-markdown";
import { version } from "../../package.json";
import "./markdown.css";
import { Cog8ToothIcon, UserGroupIcon } from "@heroicons/react/20/solid";
import { useEventSearch } from "~utils/hooks/robotevents";
import { useRecentEvents } from "~utils/hooks/history";
import { isWorldsBuild } from "~utils/data/state";
import { useQuery } from "@tanstack/react-query";
import { getEventInvitation } from "~utils/data/share";
import { ClickToCopy } from "~components/ClickToCopy";

function useHomeEvents() {
  const { data: worldsEvents } = useEventSearch(
    {
      "sku[]": [
        "RE-VRC-23-3690",
        "RE-VRC-23-3691",
        "RE-VEXU-23-3692",
        "RE-VRC-23-3695",
        "RE-VIQRC-23-3693",
        "RE-VIQRC-23-3694",
      ],
    },
    { enabled: isWorldsBuild() }
  );

  const { data: recentUser } = useRecentEvents(5);

  return isWorldsBuild() ? worldsEvents : recentUser;
}

export const HomePage: React.FC = () => {
  const events = useHomeEvents();
  const { data: eventsInvitations } = useQuery({
    queryKey: ["event_invitations", events],
    queryFn: () =>
      Promise.all(events?.map((event) => getEventInvitation(event.sku)) ?? []),
  });

  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  useEffect(() => {
    const fetchMarkdownContent = async () => {
      try {
        const response = await fetch("/updateNotes.md");
        const content = await response.text();
        setMarkdownContent(content);
      } catch (error) {
        console.error("Error fetching Markdown content:", error);
      }
    };

    fetchMarkdownContent().then(() => {
      const userVersion = localStorage.getItem("version");

      if (userVersion && userVersion !== version) {
        setUpdateDialogOpen(true);
      }

      localStorage.setItem("version", version);
    });
  }, []);

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
          <LinkButton to="/settings" className="flex items-center gap-2">
            <Cog8ToothIcon height={20} />
            <p>Settings</p>
          </LinkButton>
        </nav>
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
        </section>
      </div>
      <Dialog
        open={updateDialogOpen}
        mode="modal"
        onClose={() => setUpdateDialogOpen(false)}
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
