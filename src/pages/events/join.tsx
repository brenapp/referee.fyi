import { FlagIcon, KeyIcon, UserCircleIcon } from "@heroicons/react/20/solid";
import { CameraIcon } from "@heroicons/react/24/outline";
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "~components/Button";
import { Dialog, DialogBody, DialogHeader } from "~components/Dialog";
import { Input } from "~components/Input";
import { Error, Success } from "~components/Warning";
import { joinShare } from "~utils/data/share";
import { useShareCode, useShareData, useShareName } from "~utils/hooks/share";
import { useCurrentEvent } from "~utils/hooks/state";
import * as robotevents from "robotevents";

function isValidCode(code: string) {
  return code.match(/[A-Z0-9]{5}-[A-Z0-9]{5}/g);
}

type JoinInfo = {
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
  onFoundCode: (info: JoinInfo) => void;
};

export const BarcodeReader: React.FC<BarcodeReaderProps> = ({
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

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia ||
    !window.BarcodeDetector
  ) {
    return null;
  }

  return (
    <>
      <Button
        mode="primary"
        className="flex items-center gap-2 justify-center"
        onClick={onScanButtonClick}
      >
        <CameraIcon height={24} />
        <p>Scan</p>
      </Button>
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

export const EventJoinPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: event } = useCurrentEvent();

  const { data: currentShareCode } = useShareCode(event?.sku);
  const [code, setCode] = useState(params.get("code") ?? "");

  useEffect(() => {
    if (currentShareCode && !code) {
      setCode(currentShareCode);
    }
  }, [currentShareCode, code]);

  const { data: shareData, isSuccess: isShareSuccess } = useShareData(
    event?.sku,
    code
  );

  const isActiveCode = useMemo(
    () => (isShareSuccess && shareData?.success) ?? false,
    [isShareSuccess, shareData]
  );

  const isInvalidCode = useMemo(
    () => (isShareSuccess && !shareData?.success) ?? false,
    [isShareSuccess, shareData]
  );

  const onChangeCode: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      let value = event.target.value.toUpperCase();

      if (value.length === 3) {
        value += "-";
      }

      setCode(value.slice(0, 7));
    },
    []
  );

  const onFoundCode = useCallback(async ({ sku, code }: JoinInfo) => {
    if (sku === event?.sku) {
      setCode(code);
      return;
    }

    const otherEvent = await robotevents.events.get(sku);
    if (!otherEvent) {
      return;
    }

    navigate(`/${otherEvent.sku}/join?code=${code}`);
    setCode(code);
  }, []);

  const onClickJoin = useCallback(async () => {
    if (event && event.sku && code && isActiveCode) {
      await joinShare({ sku: event.sku, code });
      await navigate(`/${event.sku}`);
    }
  }, [event, isActiveCode, code, navigate]);

  const { name: shareName, setName, persist } = useShareName();
  const shareNameId = useId();

  const shareId = useId();

  return (
    <section className="mt-4 flex flex-col gap-4">
      <label htmlFor={shareNameId}>
        <p>Your Name</p>
        <Input
          id={shareNameId}
          required
          value={shareName}
          onChange={(e) => setName(e.currentTarget.value)}
          onBlur={persist}
          className="w-full"
        />
      </label>
      <label htmlFor={shareId}>
        <p>Enter Share Code</p>
        <div className="flex w-full gap-4">
          <Input
            id={shareId}
            value={code ?? ""}
            onChange={onChangeCode}
            maxLength={7}
            className="font-mono flex-1 text-center"
          />
          <BarcodeReader onFoundCode={onFoundCode} />
        </div>
      </label>
      {isInvalidCode ? (
        <>
          <Error message="Invalid Code!" />
        </>
      ) : null}
      {isActiveCode && shareData?.success ? (
        <>
          <Success message="Active Group!"></Success>
          <nav className="flex gap-2 justify-evenly">
            <p className="text-lg">
              <KeyIcon height={20} className="inline mr-2" />
              <span className="text-zinc-400">{shareData.data.data.owner}</span>
            </p>
            <p className="text-lg">
              <FlagIcon height={20} className="inline mr-2" />
              <span className="text-zinc-400">
                {shareData.data.data.incidents.length} entries
              </span>
            </p>
            <p className="text-lg">
              <UserCircleIcon height={20} className="inline mr-2" />
              <span className="text-zinc-400">
                {shareData.data.users.length} active
              </span>
            </p>
          </nav>
          <Button
            mode="primary"
            onClick={onClickJoin}
            className="w-full mt-4 disabled:bg-zinc-400 text-center"
          >
            Join
          </Button>
        </>
      ) : null}
    </section>
  );
};
