import { FlagIcon, KeyIcon, UserCircleIcon } from "@heroicons/react/20/solid";
import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "~components/Button";
import { Input } from "~components/Input";
import { Error, Success } from "~components/Warning";
import { joinShare } from "~utils/data/share";
import { useShareCode, useShareData, useShareName } from "~utils/hooks/share";
import { useCurrentEvent } from "~utils/hooks/state";

function isValidCode(code: string) {
  return !!code.match(/[A-Z0-9]{3}-[A-Z0-9]{3}/g);
}

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
  }, [currentShareCode]);

  const { data: shareData, isSuccess: isShareSuccess } = useShareData(
    event?.sku,
    code,
    {
      enabled: isValidCode(code),
    }
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

  const onClickJoin = useCallback(async () => {
    console.log(event, event?.sku, isActiveCode);
    if (event && event.sku && code && isActiveCode) {
      await joinShare({ sku: event.sku, code });
      await navigate(`/${event.sku}`);
    }
  }, [event, isActiveCode]);

  const { data: shareName, setName } = useShareName();
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
          className="w-full"
        />
      </label>
      <label htmlFor={shareId}>
        <p>Enter Share Code</p>
        <Input
          id={shareId}
          value={code ?? ""}
          onChange={onChangeCode}
          aria-invalid={!isValidCode(code)}
          maxLength={7}
          className="text-6xl w-full font-mono text-center"
        />
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
            onClick={onClickJoin}
            className="w-full mt-4 bg-emerald-600 disabled:bg-zinc-400 text-center text-black"
          >
            Join
          </Button>
        </>
      ) : null}
    </section>
  );
};
