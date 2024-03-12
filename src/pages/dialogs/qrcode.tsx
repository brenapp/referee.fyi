import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonProps } from "~components/Button";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { Error } from "~components/Warning";

export function isValidCode(code: string) {
  return !!code.match(/[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/g);
}

export type JoinInfo = {
  sku: string;
  code: string;
};

function extractJoinInformation(url: URL): JoinInfo | null {
  if (!url.pathname.endsWith("join")) {
    return null;
  }

  if (!url.searchParams.has("code")) {
    return null;
  }

  const sku = url.pathname.split("/")[1];
  const code = url.searchParams.get("code")!;

  if (!isValidCode(code)) {
    return null;
  }

  return { sku, code };
}

export type BarcodeReaderProps = {
  children: React.FC<ButtonProps>;
  onFoundCode: (info: JoinInfo) => void;
};

export const BarcodeReader: React.FC<BarcodeReaderProps> = ({
  children,
  onFoundCode,
}) => {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");

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
              const url = new URL(code.rawValue);
              const info = extractJoinInformation(url);
              if (info) {
                console.log(info);
                onFoundCode(info);
                setOpen(false);
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
        </DialogBody>
      </Dialog>
    </>
  );
};
