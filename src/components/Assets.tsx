import { useCallback, useMemo, useState } from "react";
import { ImageLocalAsset, LocalAsset } from "~utils/data/assets";
import { twMerge } from "tailwind-merge";
import { Dialog, DialogHeader } from "./Dialog";
import { useAssetOriginalURL, useAssetPreviewURL } from "~utils/hooks/assets";
import { useCurrentEvent } from "~utils/hooks/state";

export type AssetPickerProps = Omit<
  React.HTMLProps<HTMLInputElement>,
  "onChange" | "multiple" | "value"
> & {
  onPick?: (buffer: LocalAsset) => void;
  readonly fields: Omit<LocalAsset, "data" | "id">;
};

export const AssetPicker: React.FC<AssetPickerProps> = ({
  onPick,
  fields,
  ...props
}) => {
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const blob = e.target.files?.[0];
      if (!blob) return;

      const asset: LocalAsset = {
        id: crypto.randomUUID(),
        data: blob,
        ...fields,
      };

      onPick?.(asset);
    },
    [fields, onPick]
  );
  return (
    <input
      type="file"
      {...props}
      className={twMerge("sr-only", props.className)}
      onChange={onChange}
    />
  );
};

export type LocalImageAssetPreviewProps = {
  asset: ImageLocalAsset;
} & React.HTMLProps<HTMLDivElement>;

export const ImageAssetPreview: React.FC<LocalImageAssetPreviewProps> = ({
  asset,
}) => {
  const url = useMemo(() => URL.createObjectURL(asset.data), [asset.data]);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Dialog
        mode="modal"
        open={open}
        onClose={() => setOpen(false)}
        className="w-full h-full bg-contain bg-no-repeat bg-center"
        style={{ backgroundImage: `url(${url})` }}
      >
        <DialogHeader title="Image" onClose={() => setOpen(false)} />
      </Dialog>
      <img
        className="w-full h-full object-cover aspect-square rounded-md"
        onClick={() => setOpen(true)}
        src={url}
        alt="Asset"
      />
    </>
  );
};

export type LocalAssetPreviewProps = {
  asset: LocalAsset;
} & React.HTMLProps<HTMLDivElement>;

export const LocalAssetPreview: React.FC<LocalAssetPreviewProps> = ({
  asset,
  ...props
}) => {
  if (asset.type === "image") {
    return <ImageAssetPreview asset={asset} {...props} />;
  }

  return (
    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
      <span>Unsupported asset type</span>
    </div>
  );
};

export type AssetPreviewProps = {
  asset: string;
};

export const AssetPreview: React.FC<AssetPreviewProps> = ({ asset }) => {
  const [open, setOpen] = useState(false);
  const { data: event } = useCurrentEvent();

  const { data: previewUrl } = useAssetPreviewURL(event?.sku, asset);
  const { data: originalUrl } = useAssetOriginalURL(event?.sku, asset, {
    enabled: open,
  });

  return (
    <>
      <Dialog
        mode="modal"
        open={open}
        onClose={() => setOpen(false)}
        className="w-full h-full bg-contain bg-no-repeat bg-center"
        style={{ backgroundImage: `url(${originalUrl ?? previewUrl})` }}
      >
        <DialogHeader title="Image" onClose={() => setOpen(false)} />
      </Dialog>
      <img
        className="w-full h-full object-cover aspect-square rounded-md"
        onClick={() => setOpen(true)}
        src={previewUrl ?? undefined}
        alt="Asset"
      />
    </>
  );
};
