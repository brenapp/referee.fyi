import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
	type AssetUploadStatus,
	getLocalAsset,
	getManyAssetUploadStatus,
	type LocalAsset,
	saveLocalAsset,
} from "~utils/data/assets";
import { getIncidentsByEvent } from "~utils/data/incident";
import { getAssetOriginalURL, getAssetPreviewURL } from "~utils/data/share";
import { useEventIncidents, useTeamIncidentsByEvent } from "./incident";
import type { HookQueryOptions } from "./robotevents";

export function useLocalAsset(id?: string | null) {
	return useQuery({
		queryKey: ["assets", id],
		queryFn: async () => {
			if (!id) {
				return undefined;
			}
			const asset = await getLocalAsset(id);
			return asset;
		},
	});
}

export function useLocalAssets(
	ids: string[],
	options?: HookQueryOptions<(LocalAsset | undefined)[]>,
) {
	return useQuery({
		queryKey: ["assets", ids],
		queryFn: async () => {
			const assets = await Promise.all(ids.map(getLocalAsset));
			return assets;
		},
		...options,
	});
}

export function useLocalAssetUploadStatus(assetIds?: string[]) {
	return useQuery({
		queryKey: ["assets", "upload-status", assetIds],
		queryFn: async () => {
			const statuses: Record<string, AssetUploadStatus> = {};

			if (!assetIds || assetIds.length === 0) {
				return statuses;
			}
			const uploadStatuses = await getManyAssetUploadStatus(assetIds);

			for (let i = 0; i < assetIds.length; i++) {
				const assetId = assetIds[i];
				const status = uploadStatuses[i];
				if (assetId && status) {
					statuses[assetId] = status;
				}
			}

			return statuses;
		},
	});
}

export function useLocalAssetIdsForEvent(sku?: string) {
	const { data: incidents, isPending } = useEventIncidents(sku);
	return useQuery({
		queryKey: ["assets", "ids", sku],
		queryFn: async () => {
			return incidents?.flatMap((incident) => incident.assets ?? []) ?? [];
		},
		enabled: !!sku && !isPending,
	});
}

export function useLocalAssetIdsToUploadForEvent(sku?: string) {
	return useQuery({
		queryKey: ["assets", "to-upload", sku],
		queryFn: async () => {
			if (!sku) {
				return [];
			}

			const incidents = await getIncidentsByEvent(sku);
			const assetIds = incidents.flatMap((incident) => incident.assets ?? []);

			if (assetIds.length === 0) {
				return [];
			}

			const uploadStatuses = await getManyAssetUploadStatus(assetIds);

			return assetIds.filter((_, index) => {
				const status = uploadStatuses[index];
				return !status || status.step !== "complete" || !status.success;
			});
		},
		enabled: !!sku,
		refetchOnMount: true,
		refetchOnReconnect: true,
	});
}

export function useEventAssetsForTeam(sku?: string, team?: string) {
	const { data: incidents } = useTeamIncidentsByEvent(team, sku);
	return useMemo(
		() => incidents?.flatMap((incident) => incident.assets ?? []) ?? [],
		[incidents],
	);
}

export function useSaveAssets(assets: LocalAsset[]) {
	return useMutation({
		mutationKey: ["assets", "save"],
		mutationFn: async () => {
			return assets.map(saveLocalAsset);
		},
	});
}

export function useAssetPreviewURL(
	sku: string | undefined,
	id: string,
	options?: HookQueryOptions<string | null>,
) {
	return useQuery({
		queryKey: ["assets", id, sku, "preview"],
		queryFn: async () => {
			const local = await getLocalAsset(id);
			if (local) {
				return URL.createObjectURL(local.data);
			}

			if (!sku) {
				return null;
			}

			const remote = await getAssetPreviewURL(sku, id);
			if (!remote || !remote.success) {
				return null;
			}

			return remote.data.previewURL;
		},
		...options,
	});
}

export function useAssetOriginalURL(
	sku: string | undefined,
	id: string,
	options?: HookQueryOptions<string | null>,
) {
	return useQuery({
		queryKey: ["assets", id, "original"],
		queryFn: async () => {
			const local = await getLocalAsset(id);
			if (local) {
				return URL.createObjectURL(local.data);
			}

			if (!sku) {
				return null;
			}

			const remote = await getAssetOriginalURL(sku, id);
			if (!remote || !remote.success) {
				return null;
			}

			return remote.data.url;
		},
		staleTime: 1000 * 60 * 5,
		...options,
	});
}
