import { z } from "zod/v4";

export const GrowSetElementSchema = z.union([
	z.string(),
	z.number(),
	z.coerce.boolean(),
	z.undefined(),
	z.null(),
]);

export type GrowSetElement = z.infer<typeof GrowSetElementSchema>;

export type GrowSet<T extends GrowSetElement> = T[];
export const GrowSetSchema = z.array(
	z.union([
		z.string(),
		z.number(),
		z.coerce.boolean(),
		z.undefined(),
		z.null(),
	]),
);

export type MergeGrowSetOptions<T extends GrowSetElement> = {
	local: GrowSet<T>;
	remote: GrowSet<T>;
};

export type MergeGrowSetResults<T extends GrowSetElement> = {
	resolved: GrowSet<T>;
	localOnly: GrowSet<T>;
	remoteOnly: GrowSet<T>;
};

export function mergeGrowSet<T extends GrowSetElement>({
	local,
	remote,
}: MergeGrowSetOptions<T>): MergeGrowSetResults<T> {
	const localSet = new Set(local);
	const remoteSet = new Set(remote);

	const resolved = localSet.union(remoteSet);
	const localOnly = localSet.difference(remoteSet);
	const remoteOnly = remoteSet.difference(localSet);

	return {
		resolved: [...resolved],
		localOnly: [...localOnly],
		remoteOnly: [...remoteOnly],
	};
}
