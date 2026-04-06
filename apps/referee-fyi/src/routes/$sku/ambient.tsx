import { MicrophoneIcon, StopIcon } from "@heroicons/react/20/solid";
import { createFileRoute } from "@tanstack/react-router";
import type React from "react";
import { twMerge } from "tailwind-merge";
import { Button, IconButton } from "~components/Button";
import { Spinner } from "~components/Spinner";
import { ErrorMessage } from "~components/Warning";
import {
	type AmbientResult,
	useAmbientMode,
	useDownloadSpeechRecognitionModel,
	useSpeechRecognitionStatus,
} from "~utils/hooks/ambient";

type RecordingBarProps = React.HTMLProps<HTMLDivElement> & {};

const RecordingBar: React.FC<RecordingBarProps> = ({ className, ...props }) => {
	const { start, listening, stop } = useAmbientMode();
	return (
		<nav
			className={twMerge(
				"rounded-lg p-4 h-16 flex items-center justify-center mb-4",
				className,
			)}
			{...props}
		>
			<IconButton
				className="h-24 rounded-full bg-emerald-600"
				onClick={() => (listening ? stop() : start())}
				icon={
					listening ? (
						<StopIcon className="h-12 aspect-square" />
					) : (
						<MicrophoneIcon className="h-12 aspect-square" />
					)
				}
			></IconButton>
		</nav>
	);
};

export type AmbientTranscriptionResultProps =
	React.HTMLProps<HTMLDivElement> & {
		result: AmbientResult;
	};

const AmbientTranscriptionResult: React.FC<AmbientTranscriptionResultProps> = ({
	result,
	className,
	...props
}) => {
	return (
		<div
			{...props}
			className={twMerge(
				"bg-zinc-950 rounded-md p-4",
				result.isFinal ? "" : "italic opacity-50",
				className,
			)}
		>
			{result.transcript}
		</div>
	);
};

const AmbientRoute: React.FC = () => {
	const { results, listening } = useAmbientMode();
	const { data: status } = useSpeechRecognitionStatus();
	const { mutate, isPending } = useDownloadSpeechRecognitionModel();

	if (status === "unavailable") {
		return (
			<section className="mt-4 flex flex-col max-h-full">
				<ErrorMessage message="Not Supported">
					Your device does not support ambient mode.
				</ErrorMessage>
			</section>
		);
	}

	return (
		<section className="mt-4 flex flex-col max-h-full">
			{status === "downloadable" ? (
				<Button mode="primary" onClick={() => mutate()}>
					Prepare Ambient
				</Button>
			) : null}
			<Spinner show={isPending || status === "downloading"} />
			<section className="flex-1">
				{results.map((result) => (
					<AmbientTranscriptionResult
						key={result.transcript}
						result={result}
						className="mb-2 last:mb-0"
					/>
				))}
				{listening ? <div className="bg-zinc-950 rounded-md p-4"></div> : null}
			</section>
			{status === "available" ? <RecordingBar className="mt-4" /> : null}
		</section>
	);
};

export const Route = createFileRoute("/$sku/ambient")({
	component: AmbientRoute,
});
