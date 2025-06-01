export type AssetType = "image";

export type AssetMeta<T extends AssetType = AssetType> = {
  id: string; // UUID (from client)
  type: T;
  owner: string; // Peer ID of asset
  sku: string; // Event SKU of associated asset
};

export type ImageAssetMeta = AssetMeta<"image"> & {
  images_id: string | null; // The ID from cloudflare.
};
