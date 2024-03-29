import { Button, LinkButton } from "~components/Button";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogHeader, DialogBody } from "~components/Dialog";
import Markdown from "react-markdown";
import { version } from "../../package.json";
import "./markdown.css";
import DocumentDuplicateIcon from "@heroicons/react/24/outline/DocumentDuplicateIcon";
import { Cog8ToothIcon } from "@heroicons/react/20/solid";
import { useEventSearch } from "~utils/hooks/robotevents";

export const HomePage: React.FC = () => {
  const { data: events } = useEventSearch({
    sku: [
      "RE-VRC-23-3690",
      "RE-VRC-23-3691",
      "RE-VEXU-23-3692",
      "RE-VRC-23-3695",
      "RE-VIQRC-23-3693",
      "RE-VIQRC-23-3694",
    ],
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

  const onClickCopyBuild = useCallback(() => {
    navigator.clipboard.writeText(__REFEREE_FYI_VERSION__);
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
              className="w-full max-w-full mt-4"
              key={event.sku}
            >
              <p className="text-sm">
                <span className=" text-emerald-400 font-mono">{event.sku}</span>
              </p>
              <p className="">{event.name}</p>
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
            <Button
              mode="normal"
              className="font-mono text-left mt-2 flex items-center gap-2 active:bg-zinc-500"
              onClick={onClickCopyBuild}
            >
              <DocumentDuplicateIcon height={20} />
              <span>{__REFEREE_FYI_VERSION__}</span>
            </Button>
          </section>
          <Markdown className="p-4 pt-0">{markdownContent}</Markdown>
        </DialogBody>
      </Dialog>
    </>
  );
};

export default HomePage;
