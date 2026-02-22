import { useCallback, useMemo } from "react";
import { useLatestAppVersion } from "~utils/hooks/state";
import { clearCache } from "~utils/sentry";
import { Button } from "./Button";
import { toast } from "./Toast";
import { Info } from "./Warning";

export const UpdatePrompt: React.FC = () => {
	const { data: latestAppVersion, isPending: isPendingLatestAppVersion } =
		useLatestAppVersion();

	const showUpdateMessage = useMemo(() => {
		if (isPendingLatestAppVersion) {
			return false;
		}

		if (!navigator.onLine) {
			return false;
		}

		return __REFEREE_FYI_VERSION__ !== latestAppVersion;
	}, [latestAppVersion, isPendingLatestAppVersion]);

	const update = useCallback(() => {
		toast({ type: "info", message: "Updating..." });
		clearCache();
	}, []);

	if (!showUpdateMessage) {
		return null;
	}

	return (
		<Info message="Update Available!" className="mt-4 bg-zinc-700 text-white">
			<p className="mt-2">
				A new version of Referee FYI is available. If you have stable Internet,
				update now to ensure compatibility with the sharing server.
			</p>
			<Button className="mt-4" mode="primary" onClick={update}>
				Update App Version
			</Button>
		</Info>
	);
};
