import {
  FlagIcon,
  KeyIcon,
  UserCircleIcon,
  CameraIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, IconButton } from "~components/Button";
import { Input } from "~components/Input";
import { Error, Success } from "~components/Warning";
import { joinShare } from "~utils/data/share";
import { useShareCode, useShareData, useShareName } from "~utils/hooks/share";
import { useCurrentEvent } from "~utils/hooks/state";
import * as robotevents from "robotevents";
import { BarcodeReader, JoinInfo, isValidCode } from "pages/dialogs/qrcode";

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
    code,
    { enabled: isValidCode(code) }
  );

  const isCodeValidForm = useMemo(() => isValidCode(code), [code]);

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

      // - insertion
      if (value.length > code.length) {
        if (value.length === 4) value += "-";
        if (value.length === 9) value += "-";
      }

      setCode(value);
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
          <div className="relative flex-1">
            <Input
              id={shareId}
              value={code ?? ""}
              onChange={onChangeCode}
              className="font-mono w-full"
            />
            <IconButton
              icon={<XMarkIcon height={20} />}
              onClick={() => setCode("")}
              className="absolute top-0 bottom-0 right-0 bg-transparent"
            />
          </div>
          <BarcodeReader onFoundCode={onFoundCode}>
            {(props) => (
              <Button
                mode="primary"
                className="flex items-center gap-2 justify-center w-24"
                {...props}
              >
                <CameraIcon height={20} />
                <p>Scan</p>
              </Button>
            )}
          </BarcodeReader>
        </div>
      </label>
      {isInvalidCode && isCodeValidForm ? (
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
