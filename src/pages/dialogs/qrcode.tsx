import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonProps } from "~components/Button";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { Error } from "~components/Warning";

export type InvitationInfo = {
  client_version: string;
  user: {
    name: string;
    key: string;
  };
};

function isValidInvitationInfo(
  value: Record<string, unknown>
): value is InvitationInfo {
  const versionMatch =
    Object.hasOwn(value, "client_version") &&
    value.client_version === __REFEREE_FYI_VERSION__;

  const hasUser =
    Object.hasOwn(value, "user") &&
    Object.hasOwn(value.user as Record<string, string>, "name") &&
    Object.hasOwn(value.user as Record<string, string>, "key") &&
    typeof (value.user as Record<string, string>).name === "string" &&
    typeof (value.user as Record<string, string>).key === "string";

  return versionMatch && hasUser;
}

export type BarcodeReaderProps = {
  children: React.FC<ButtonProps>;
  confirmationStep: React.FC<{ info: InvitationInfo; pass: () => void }>;
  onFoundCode: (info: InvitationInfo) => void;
};

export const BarcodeReader: React.FC<BarcodeReaderProps> = ({
  children,
  onFoundCode,
  confirmationStep,
}) => {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");

  const [info, setInfo] = useState<InvitationInfo | null>(null);

  const onScanButtonClick = useCallback(async () => {
    setOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(stream);
    } catch (e) {
      setError(`Cannot access camera! ${e}`);
    }
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();

      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const onLoadedMetadata = async () => {
        if (!videoRef.current) return;
        let canvas = document.createElement("canvas");

        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const context = canvas.getContext("2d");

        const searchLoop = async () => {
          if (!videoRef.current) return;
          context?.drawImage(
            videoRef.current,
            0,
            0,
            canvas.width,
            canvas.height
          );

          const barcodes = await detector.detect(canvas);
          for (const code of barcodes) {
            try {
              const value = JSON.parse(code.rawValue);
              if (isValidInvitationInfo(value)) {
                setInfo(value);
              }
            } catch (e) {
              continue;
            }
          }

          requestAnimationFrame(searchLoop);
        };

        searchLoop();
      };

      videoRef.current.addEventListener("loadedmetadata", onLoadedMetadata);
      return () =>
        videoRef.current?.removeEventListener(
          "loadedmetadata",
          onLoadedMetadata
        );
    }
  }, [stream, videoRef]);

  useEffect(() => {
    if (!open) {
      stream?.getTracks().forEach((t) => t.stop());
    }
  }, [open]);

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia ||
    !window.BarcodeDetector
  ) {
    return null;
  }

  return (
    <>
      {children({ onClick: onScanButtonClick })}
      <Dialog open={open} mode="modal" onClose={() => setOpen(false)}>
        <DialogHeader title="Scan QR Code" onClose={() => setOpen(false)} />
        <DialogBody>
          {error ? <Error message={error} /> : null}
          <video ref={videoRef} className="w-full rounded-md"></video>
          {info
            ? confirmationStep({ info, pass: () => onFoundCode(info) })
            : null}
        </DialogBody>
      </Dialog>
    </>
  );
};
