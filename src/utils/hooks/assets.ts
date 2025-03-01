import { useMutation, useQuery } from "@tanstack/react-query";
import { getLocalAsset, LocalAsset, saveLocalAsset } from "~utils/data/assets";
import { useTeamIncidentsByEvent } from "./incident";
import { HookQueryOptions } from "./robotevents";
import { getAssetOriginalURL, getAssetPreviewURL } from "~utils/data/share";
import { useMemo } from "react";

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
  options?: HookQueryOptions<(LocalAsset | undefined)[]>
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

export function useEventAssetsForTeam(sku?: string, team?: string) {
  const { data: incidents } = useTeamIncidentsByEvent(team, sku);
  return useMemo(
    () => incidents?.flatMap((incident) => incident.assets ?? []) ?? [],
    [incidents]
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
  options?: HookQueryOptions<string | null>
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
  options?: HookQueryOptions<string | null>
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
    ...options,
  });
}
