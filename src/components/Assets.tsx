import { useCallback, useMemo, useState } from "react";
import { ImageLocalAsset, LocalAsset } from "~utils/data/assets";
import { twMerge } from "tailwind-merge";
import { Dialog, DialogBody, DialogHeader } from "./Dialog";
import { useAssetOriginalURL, useAssetPreviewURL } from "~utils/hooks/assets";
import { useCurrentEvent } from "~utils/hooks/state";
import { PhotoIcon } from "@heroicons/react/20/solid";

export const PhotoFallback: React.FC<React.HTMLProps<HTMLDivElement>> = (
  props
) => {
  return (
    <div
      {...props}
      className={twMerge(
        "bg-zinc-700 animate-pulse rounded-md flex justify-center items-center aspect-square",
        props.className
      )}
    >
      <PhotoIcon className="h-8 w-8 text-zinc-200" />
    </div>
  );
};

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

export type ImagePreviewProps = {
  previewUrl: string;
  originalUrl?: string | null;
} & React.HTMLProps<HTMLImageElement>;

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  originalUrl,
  previewUrl,
  ...props
}) => {
  const [open, setOpen] = useState(false);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen(true);
    },
    [setOpen]
  );

  return (
    <>
      <Dialog
        mode="modal"
        open={open}
        onClose={() => setOpen(false)}
        className="w-full h-full"
      >
        <DialogHeader title="Image" onClose={() => setOpen(false)} />
        <DialogBody className="flex items-center justify-center">
          <div className="relative inset-0 flex items-center justify-center">
            <img
              className="max-w-full max-h-full object-cover rounded-md z-10"
              src={originalUrl ?? previewUrl}
              {...props}
            />
            <PhotoFallback className="absolute w-full h-full" />
          </div>
        </DialogBody>
      </Dialog>
      <img
        className="w-full h-full object-cover aspect-square z-10 rounded-md bg-zinc-700"
        onClick={onClick}
        src={previewUrl}
        {...props}
      />
    </>
  );
};

export type LocalImageAssetPreviewProps = {
  asset: ImageLocalAsset;
} & React.HTMLProps<HTMLDivElement>;

export const ImageAssetPreview: React.FC<LocalImageAssetPreviewProps> = ({
  asset,
}) => {
  const url = useMemo(() => URL.createObjectURL(asset.data), [asset.data]);
  return <ImagePreview previewUrl={url} originalUrl={url} />;
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
  const { data: event } = useCurrentEvent();

  const { data: previewUrl } = useAssetPreviewURL(event?.sku, asset);
  const { data: originalUrl } = useAssetOriginalURL(event?.sku, asset);

  if (!previewUrl) {
    return <PhotoFallback />;
  }

  return (
    <ImagePreview previewUrl={previewUrl ?? ""} originalUrl={originalUrl} />
  );
};
