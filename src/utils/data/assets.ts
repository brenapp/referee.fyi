import { get, set } from "./keyval";

export type LocalAssetType = "image";

export type LocalAsset = {
  id: string;
  type: LocalAssetType;
  data: Blob;
};

export type ImageLocalAsset = LocalAsset & {
  type: "image";
};

export function getLocalAsset(id: string) {
  return get<LocalAsset>(`asset_${id}`);
}

export async function saveLocalAsset(asset: LocalAsset) {
  return set(`asset_${asset.id}`, asset);
}

export function generateLocalAsset(type: LocalAssetType, data: Blob) {
  return {
    id: crypto.randomUUID(),
    type,
    data,
  } satisfies LocalAsset;
}
