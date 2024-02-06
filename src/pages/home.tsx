import { Button, LinkButton } from "~components/Button";
import { useRecentEvents } from "~utils/hooks/history";
import { useEffect, useState } from "react";
import { Dialog, DialogHeader, DialogBody } from "~components/Dialog";
import Markdown from "react-markdown";
import pjson from "../../package.json";
import "./markdown.css";

export const HomePage: React.FC = () => {
  const { data: recentEvents } = useRecentEvents(5);

  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  useEffect(() => {
    // Fetch the update notes as a markdown file
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

    const latestVersion = pjson.version;
    const userVersion = localStorage.getItem("version");

    if (userVersion && userVersion !== latestVersion) {
      setUpdateDialogOpen(true);
    }
    localStorage.setItem("version", latestVersion);
  }, []); // Run this effect only once, when the component mounts

  return (
    <>
      <div>
        <aside className="text-right">
          <Button
            mode="primary"
            className="text-right ml-auto w-max mt-4"
            onClick={() => setUpdateDialogOpen(true)}
          >
            Update Notes
          </Button>
        </aside>

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
          <Markdown className="p-4">{markdownContent}</Markdown>
        </DialogBody>
      </Dialog>
    </>
  );
};
