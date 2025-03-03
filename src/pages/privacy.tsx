import { useQuery } from "@tanstack/react-query";
import Markdown from "react-markdown";
import PrivacyPolicy from "/privacy.md?url";

import "./markdown.css";

function usePrivacyPolicy() {
  return useQuery({
    queryKey: ["privacy_policy"],
    queryFn: async () => {
      const response = await fetch(PrivacyPolicy);
      return response.text();
    },
  });
}

export const PrivacyPage: React.FC = () => {
  const { data: markdownContent } = usePrivacyPolicy();
  return (
    <main className="max-w-prose mx-auto px-4 py-8 overflow-y-scroll">
      <Markdown className="markdown">{markdownContent}</Markdown>
    </main>
  );
};

export default PrivacyPage;
