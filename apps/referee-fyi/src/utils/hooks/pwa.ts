import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { externalStore } from "~utils/data/store";

export type DisplayMode = "standalone" | "browser" | "unknown";

interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{
		outcome: "accepted" | "dismissed";
		platform: string;
	}>;
	prompt(): Promise<void>;
}

declare global {
	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent;
	}
}

export function useDisplayMode() {
	const [mode, setMode] = useState<DisplayMode>("unknown");
	const ref = useRef<MediaQueryList | null>(null);

	useEffect(() => {
		const match = window.matchMedia("(display-mode: standalone)");

		const handler = () => {
			setMode(match.matches ? "standalone" : "browser");
		};

		match.addEventListener("change", handler);
		ref.current = match;

		handler();
		return () => {
			match.removeEventListener("change", handler);
		};
	}, []);

	return mode;
}

const INSTALL_PROMPT = externalStore<BeforeInstallPromptEvent | null>(null);
window.addEventListener("beforeinstallprompt", (event) => {
	event.preventDefault();
	INSTALL_PROMPT.set(event);
});

export function useInstallPrompt() {
	const prompt = useSyncExternalStore(
		INSTALL_PROMPT.subscribe,
		INSTALL_PROMPT.getSnapshot,
	);

	return prompt;
}
