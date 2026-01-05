import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { Routes } from "~types/worker/sync";
import { getGeolocation } from "~utils/data/meta";
import { HookQueryOptions } from "./robotevents";

export function useGeolocation(
  options?: HookQueryOptions<
    Routes["/api/meta/location"]["get"]["data"]["location"] | null
  >
): UseQueryResult<
  Routes["/api/meta/location"]["get"]["data"]["location"] | null
> {
  return useQuery({
    queryKey: ["@referee-fyi/useGeoLocation"],
    queryFn: getGeolocation,
    staleTime: 1000 * 60 * 60 * 4,
    ...options,
  });
}
