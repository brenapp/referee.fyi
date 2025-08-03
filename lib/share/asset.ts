import { z } from "zod/v4";

export const AssetTypeSchema = z.enum(["image"]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

export const AssetMetaBaseSchema = z.object({
  id: z.string(),
  owner: z.string(),
  sku: z.string(),
});

export const ImageAssetMetaSchema = AssetMetaBaseSchema.extend({
  type: z.literal("image"),
  images_id: z.string().nullable(),
});
export type ImageAssetMeta = z.infer<typeof ImageAssetMetaSchema>;

export const AssetMetaSchema = z.discriminatedUnion("type", [
  ImageAssetMetaSchema,
]);
export type AssetMeta = z.infer<typeof AssetMetaSchema>;
