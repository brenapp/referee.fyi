import { useMatch, useParams } from "react-router-dom";
import { HookQueryOptions, useEvent } from "./robotevents";
import { EventData } from "robotevents";
import { useQuery } from "@tanstack/react-query";

export function useSKU() {
  const { sku } = useParams();
  return sku;
}

export function useCurrentEvent(
  options?: HookQueryOptions<EventData | null | undefined>
) {
  const { sku } = useParams();
  return useEvent(sku ?? "", options);
}

export function useCurrentDivision(def?: number) {
  const match = useMatch("/:sku/:division");

  if (!match) {
    return def;
  }

  if (!match.params.division) {
    return def;
  }

  const division = Number.parseInt(match.params.division);
  if (Number.isNaN(division)) {
    return def;
  }

  return division;
}

export function useLatestAppVersion() {
  return useQuery({
    queryKey: ["latest_app_version"],
    queryFn: async () => {
      if (import.meta.env.DEV) {
        return "DEV-MODE";
      }

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
