import { Button, IconButton, LinkButton } from "~components/Button";
import { useRecentEvents } from "~utils/hooks/history";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogHeader, DialogBody } from "~components/Dialog";
import Markdown from "react-markdown";
import { version } from "../../package.json";
import "./markdown.css";
import DocumentDuplicateIcon from "@heroicons/react/24/outline/DocumentDuplicateIcon";
import { Cog8ToothIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

export const HomePage: React.FC = () => {
  const { data: recentEvents } = useRecentEvents(5);

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

    fetchMarkdownContent();

    const userVersion = localStorage.getItem("version");

    if (userVersion && userVersion !== version) {
      setUpdateDialogOpen(true);
    }

    localStorage.setItem("version", version);
  }, []);

  const onClickCopyBuild = useCallback(() => {
    navigator.clipboard.writeText(__REFEREE_FYI_VERSION__);
  }, []);

  return (
    <>
      <div>
        <nav className="flex justify-between items-center gap-4 mt-4">
          <Button
            mode="primary"
            className="text-right w-max "
            onClick={() => setUpdateDialogOpen(true)}
          >
            Update Notes
          </Button>
          <Link to="/settings">
            <IconButton
              icon={<Cog8ToothIcon height={24} />}
              className="bg-transparent"
            />
          </Link>
        </nav>

        <section className="max-w-full">
          {recentEvents?.map((event) => (
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
