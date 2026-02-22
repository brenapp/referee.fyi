import { createFileRoute } from "@tanstack/react-router";
import { ReactComponent as PrivacyPolicy } from "../../../../documents/privacy.md";

import "./markdown.css";

export const PrivacyPage: React.FC = () => {
	return (
		<main className="max-w-prose md:max-w-screen-md lg:max-w-screen-lg mx-auto px-4 py-8 overflow-y-auto markdown mt-4">
			<PrivacyPolicy />
		</main>
	);
};

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
});
