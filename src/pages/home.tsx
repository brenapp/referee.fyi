import { LinkButton } from "~components/Button";
import { useRecentEvents } from "~utils/hooks/history";
import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import pjson from "../../package.json";
import "./markdown.css";

export const HomePage: React.FC = () => {
  const { data: recentEvents } = useRecentEvents(5);

  const [markdownContent, setMarkdownContent] = useState<string>("");

  useEffect(() => {
    // Fetch the update notes as a markdown file
    const fetchMarkdownContent = async () => {
      try {
        const response = await fetch("updateNotes.md");
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
      document.getElementById("markdown")?.classList.remove("hidden");
    }
    localStorage.setItem("version", latestVersion);
  }, []); // Run this effect only once, when the component mounts

  return (
    <main>
      <aside className="text-right">
        <button
          className="bg-cyan-900 text-right ml-auto mt-2 py-1 px-3 rounded-md"
          onClick={() =>
            document.getElementById("markdown")?.classList.remove("hidden")
          }
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
      <div
        className="hidden absolute top-8 left-1/2 rounded-md p-4 bg-neutral-800 -translate-x-1/2 w-11/12"
        id="markdown"
      >
        <div
          className="absolute top-2 right-2 cursor-pointer"
          onClick={() =>
            document.getElementById("markdown")?.classList.add("hidden")
          }
        >
          &#10006; {/* Unicode character for X */}
        </div>
        <Markdown className="markdown">{markdownContent}</Markdown>
      </div>
    </main>
  );
};
