import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AssetPreview } from "~components/Assets";
import { Button } from "~components/Button";
import { Spinner } from "~components/Spinner";
import { ErrorMessage } from "~components/Warning";
import { useShareConnection } from "~models/ShareConnection";
import type { LocalAsset } from "~utils/data/assets";
import {
	useLocalAssetIdsToUploadForEvent,
	useLocalAssets,
} from "~utils/hooks/assets";
import { useCurrentEvent } from "~utils/hooks/state";

function useLocalAssetBulkUpload(ids: string[]) {
	const { data: event } = useCurrentEvent();
	const { data: assets } = useLocalAssets(ids);

	const { uploadAsset } = useShareConnection(["uploadAsset"]);

	return useMutation({
		mutationKey: ["assets", "bulk-upload", ids],
		mutationFn: async () => {
			if (!event) {
				throw new Error("Could not resolve event.");
			}

			if (!assets) {
				return;
			}

			const toUpload: LocalAsset[] = assets.filter((asset) => !!asset);
			const uploadPromises = toUpload.map((asset) =>
				uploadAsset(event.sku, asset),
			);

			return Promise.all(uploadPromises);
		},
		networkMode: "online",
	});
}

export const EventAssets: React.FC = () => {
	const { data: event } = useCurrentEvent();
	const { data: assetIdsToUpload } = useLocalAssetIdsToUploadForEvent(
		event?.sku,
	);
	const {
		mutate,
		isPending: isPendingUpload,
		error,
	} = useLocalAssetBulkUpload(assetIdsToUpload ?? []);

	return (
		<div>
			<section className="mt-4">
				<h2 className="font-bold">Assets To Upload</h2>
				<p>
					When you have a stable network connection, upload these assets to make
					them available to others.
				</p>
				<Button
					mode="primary"
					onClick={() => mutate()}
					disabled={!assetIdsToUpload?.length || isPendingUpload}
					className="my-2"
				>
					Upload All
				</Button>
				{error && (
					<ErrorMessage
						className="my-2"
						message={
							error instanceof Error
								? error.message
								: "An unknown error occurred during upload."
						}
					/>
				)}
				<Spinner show={isPendingUpload} />
				{assetIdsToUpload?.map((assetId) => (
					<div key={assetId} className="mb-2">
						<AssetPreview asset={assetId} />
					</div>
				))}
			</section>
		</div>
	);
};

export const Route = createFileRoute("/$sku/assets")({
	component: EventAssets,
});
