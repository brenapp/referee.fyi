import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { EventData } from "robotevents";
import { type HookQueryOptions, useEvent } from "./robotevents";

export function useCurrentEvent(
	options?: HookQueryOptions<EventData | null | undefined>,
) {
	const { sku } = useParams({ strict: false });
	return useEvent(sku ?? "", options);
}

export function useCurrentDivision(def?: number) {
	const { division: divisionParam } = useParams({ strict: false });

	if (!divisionParam) {
		return def;
	}

	const division = Number.parseInt(divisionParam);
	if (Number.isNaN(division)) {
		return def;
	}

	return division;
}

export function useLatestAppVersion() {
	return useQuery({
		queryKey: ["latest_app_version"],
		queryFn: async () => {
			const headers = new Headers();
			headers.append("pragma", "no-cache");
			headers.append("cache-control", "no-cache");
			const response = await fetch("/version.json", { headers });

			// If we can't fetch the latest version for whatever reason, just pretend our version is the latest
			if (!response.ok) {
				return __REFEREE_FYI_VERSION__;
			}
			try {
				const data = await response.json();
				if (typeof data.version !== "string") {
					return __REFEREE_FYI_VERSION__;
				}

				return data.version as string;
			} catch (error) {
				return __REFEREE_FYI_VERSION__;
			}
		},
		staleTime: 1000 * 60 * 10,
	});
}
