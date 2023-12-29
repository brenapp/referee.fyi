import { LinkButton } from "~components/Button";
import { useRecentEvents } from "~utils/hooks/history";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import pjson from "../../package.json";
import "./markdown.css";

export const HomePage: React.FC = () => {
  const { data: recentEvents } = useRecentEvents(5);

  const [markdownContent, setMarkdownContent] = useState<string>("");

  const dialog = document.getElementById(
    "markdown-dialog"
  ) as HTMLDialogElement;

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
      if (dialog) {
        dialog.show();
      }
    }
    localStorage.setItem("version", latestVersion);
  }, []); // Run this effect only once, when the component mounts

  return (
    <>
      <main>
        <aside className="text-right">
          <button
            className="bg-cyan-900 text-right ml-auto mt-2 py-1 px-3 rounded-md"
            onClick={() => dialog.show()}
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
      </main>
      <dialog
        className="markdown absolute overflow-y-auto text-white absolute top-0 left-1/2 rounded-b-md p-4 bg-slate-800 -translate-x-1/2 w-11/12"
        id="markdown-dialog"
      >
        <div
          className=" sticky w-fit top-0 ml-auto mr-1 p-2 bg-slate-800 cursor-pointer rounded-md -mt-12"
          onClick={() => dialog.close()}
        >
          &#10006; {/* Unicode character for X */}
        </div>
        <Markdown>{markdownContent}</Markdown>
      </dialog>
    </>
  );
};
