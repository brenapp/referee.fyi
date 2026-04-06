import { useMutation, useQuery } from "@tanstack/react-query";
import { create } from "zustand";
import { toast } from "~components/Toast";
import {
	downloadSpeechRecognitionModel,
	getSpeechRecognition,
	getSpeechRecognitionStatus,
} from "~utils/data/ambient";

export const WakeWord = "FYI";

export type AmbientResult = {
	transcript: string;
	isFinal: boolean;
};

export type AmbientModeState = {
	speechRecognition: SpeechRecognition | null;
	status: AvailabilityStatus | null;
	installing: boolean;
	listening: boolean;
	results: AmbientResult[];

	fetchStatus: () => Promise<AvailabilityStatus>;
	install: () => Promise<boolean>;
	start: () => void;
	stop: () => void;
};

export const useAmbientMode = create<AmbientModeState>((set, get) => ({
	speechRecognition: getSpeechRecognition(),
	status: null,
	installing: false,
	listening: false,
	results: [],

	fetchStatus: async () => {
		const status = await getSpeechRecognitionStatus();
		set({ status });
		return status;
	},

	install: async () => {
		set({ installing: true });
		try {
			const result = await downloadSpeechRecognitionModel();
			const status = await getSpeechRecognitionStatus();
			set({ status, installing: false });
			return result;
		} catch (error) {
			set({ installing: false });
			throw error;
		}
	},

	start: () => {
		const recognition = get().speechRecognition;
		if (!recognition) return;

		set({ results: [], listening: true });

		recognition.onresult = (event) => {
			const results: AmbientResult[] = [];
			for (let i = 0; i < event.results.length; i++) {
				const result = event.results[i];
				results.push({
					transcript: result[0].transcript,
					isFinal: result.isFinal,
				});
			}
			set({ results });
		};

		recognition.onend = () => {
			toast({ type: "info", message: "Speech recognition stopped." });
			set({ listening: false });
		};

		recognition.onerror = (e) => {
			toast({ type: "error", message: `Speech recognition error: ${e.error}` });
			set({ listening: false });
		};

		recognition.start();
	},

	stop: () => {
		const recognition = get().speechRecognition;
		if (!recognition) return;
		recognition.stop();
	},
}));

export function useSpeechRecognitionStatus() {
	const { fetchStatus } = useAmbientMode();

	return useQuery({
		queryKey: ["@referee-fyi", "useSpeechRecognitionStatus"],
		queryFn: fetchStatus,
		gcTime: 0,
	});
}

export function useDownloadSpeechRecognitionModel() {
	const { install } = useAmbientMode();

	return useMutation({
		mutationKey: ["@referee-fyi", "useDownloadSpeechRecognitionModel"],
		mutationFn: () => install(),
	});
}

export function useIsAmbientAwake() {
	return useAmbientMode((state) =>
		state.results.some(
			(result) =>
				!result.isFinal &&
				result.transcript.toLowerCase().includes(WakeWord.toLowerCase()),
		),
	);
}
