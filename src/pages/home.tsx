import { LinkButton } from "~components/Button";
import { useRecentEvents } from "~utils/hooks/history";
import { useEffect, useState } from "react";
import { Dialog, DialogHeader, DialogBody } from "~components/Dialog";
import { DialogMode } from "~components/constants";
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
          <button
            className="bg-emerald-900 text-right ml-auto mt-4 py-1 px-3 rounded-md"
            onClick={() => setUpdateDialogOpen(true)}
          >
            View Update Notes
          </button>
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
        className="markdown"
        open={updateDialogOpen}
        mode={DialogMode.Modal}
        onClose={() => setUpdateDialogOpen(false)}
      >
        <DialogHeader
          title="What's New"
          onClose={() => setUpdateDialogOpen(false)}
        />
        <DialogBody>
          <Markdown>{markdownContent}</Markdown>
        </DialogBody>
      </Dialog>
    </>
  );
};
