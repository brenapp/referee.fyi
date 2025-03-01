import { AssetType } from "@referee-fyi/share";
import { get, set } from "./keyval";

export type LocalAssetType = AssetType;

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

export type AssetUploadStatus = {
  success: boolean;
  date: string; // ISO
};

export function getAssetUploadStatus(id: string) {
  return get<AssetUploadStatus>(`asset_upload_${id}`);
}

export function setAssetUploadStatus(id: string, status: AssetUploadStatus) {
  return set(`asset_upload_${id}`, status);
}
