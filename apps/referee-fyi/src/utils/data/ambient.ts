import { rawCssString } from "hono/css";

export const SpeechRecognition =
	window.SpeechRecognition || window.webkitSpeechRecognition;

export type SpeechRecognition = InstanceType<
	NonNullable<typeof SpeechRecognition>
>;

export const SpeechRecognitionEvent =
	window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

export const options: SpeechRecognitionOptions = {
	langs: [navigator.language],
	processLocally: false,
};

export async function getSpeechRecognitionStatus(): Promise<AvailabilityStatus> {
	if (typeof SpeechRecognition === "undefined") {
		return "unavailable";
	}

	//  Safari iOS does not have the `available` method, but it does support speech recognition.
	if (typeof SpeechRecognition.available !== "function") {
		return "available";
	}

	return SpeechRecognition.available(options);
}

/**
 * Downloads the speech recognition model for the current language.
 **/
export async function downloadSpeechRecognitionModel() {
	const status = await getSpeechRecognitionStatus();
	if (status === "unavailable") {
		return false;
	}

	if (status === "available") {
		return true;
	}

	return SpeechRecognition.install(options);
}

export function getSpeechRecognition() {
	if (typeof SpeechRecognition === "undefined") {
		return null;
	}

	const recognition = new SpeechRecognition();
	recognition.lang = options.langs[0];
	recognition.interimResults = true;
	recognition.continuous = true;

	return recognition;
}
