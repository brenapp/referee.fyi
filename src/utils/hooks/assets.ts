import { useMutation, useQuery } from "@tanstack/react-query";
import { getLocalAsset, LocalAsset, saveLocalAsset } from "~utils/data/assets";

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

export function useLocalAssets(ids: string[]) {
  return useQuery({
    queryKey: ["assets", ids],
    queryFn: async () => {
      const assets = await Promise.all(ids.map(getLocalAsset));
      return assets;
    },
  });
}

export function useSaveAssets(assets: LocalAsset[]) {
  return useMutation({
    mutationKey: ["assets", "save"],
    mutationFn: async () => {
      return assets.map(saveLocalAsset);
    },
  });
}
