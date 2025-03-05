import { ApiGetMetaLocationResponseBody } from "@referee-fyi/share";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getGeolocation } from "~utils/data/meta";

export function useGeolocation(): UseQueryResult<
  ApiGetMetaLocationResponseBody["location"] | null
> {
  return useQuery({
    queryKey: ["@referee-fyi/useGeoLocation"],
    queryFn: getGeolocation,
    staleTime: 1000 * 60 * 60 * 4,
  });
}
