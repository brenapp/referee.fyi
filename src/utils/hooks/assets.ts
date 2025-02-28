import { useMutation, useQuery } from "@tanstack/react-query";
import { getLocalAsset, LocalAsset, saveLocalAsset } from "~utils/data/assets";
import { useTeamIncidentsByEvent } from "./incident";
import { HookQueryOptions } from "./robotevents";

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
  const { data: incidents, isPending } = useTeamIncidentsByEvent(team, sku);
  console.log(sku, team, incidents);
  return useLocalAssets(incidents?.flatMap((i) => i.assets ?? []) ?? [], {
    enabled: !isPending,
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
