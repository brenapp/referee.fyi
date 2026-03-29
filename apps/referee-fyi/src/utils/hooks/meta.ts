import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import type { Routes } from "~types/worker/sync";
import { getGeolocation } from "~utils/data/meta";
import {
	getProductFlags,
	type ProductFlag,
	type ProductFlags,
} from "~utils/data/state";
import type { HookQueryOptions } from "./robotevents";

export function useGeolocation(
	options?: HookQueryOptions<
		Routes["/api/meta/location"]["get"]["data"]["location"] | null
	>,
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

export function useProductFlags(
	options?: HookQueryOptions<ProductFlag[]>,
): UseQueryResult<ProductFlag[]> {
	return useQuery({
		queryKey: ["@referee-fyi/useProductFlags"],
		queryFn: getProductFlags,
		staleTime: 1000 * 60 * 60,
		networkMode: "offlineFirst",
		...options,
	});
}

export function useProductFlag<K extends keyof ProductFlags>(key: K) {
	const { data: flags } = useProductFlags();
	return flags?.find((f) => f.key === key)?.value as ProductFlags[K] | null;
}
