import React, { useCallback, useId, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "~components/Button";
import { Input } from "~components/Input";
import { Error } from "~components/Warning";
import { useCurrentEvent } from "~hooks/state";
import { useJoinShare, useShareData } from "~utils/hooks/share";

function isValidCode(code: string) {
  return !!code.match(/[A-Z0-9]{3}-[A-Z0-9]{3}/g);
}

export const EventJoinPage: React.FC = () => {
  const { data: event } = useCurrentEvent();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [code, setCode] = useState(params.get("code") ?? "");
  const { data: shareData, isFetched } = useShareData(event?.sku, code, {
    enabled: isValidCode(code),
  });

  const { mutateAsync: joinShare } = useJoinShare(() =>
    navigate(`/${event?.sku}`)
  );

  const success = useMemo(() => {
    return shareData?.success ?? false;
  }, [shareData]);

  const errorMessage = useMemo(() => {
    if (!isFetched) return "";

    if (shareData?.success) {
      return "";
    } else {
      return shareData?.details ?? "";
    }
  }, [isFetched, shareData]);

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

  const shareId = useId();

  return (
    <section className="mt-4 flex flex-col gap-4">
      <label htmlFor={shareId}>
        <p>Enter Share Code </p>
        <Input
          id={shareId}
          value={code ?? ""}
          onChange={onChangeCode}
          aria-invalid={!isValidCode(code)}
          maxLength={7}
          className="text-6xl w-full font-mono text-center"
        />
      </label>
      {success && isFetched ? (
        <>
          <Button
            className="w-full bg-emerald-400 text-center"
            onClick={() => joinShare({ code, sku: event!.sku })}
          >
            Join
          </Button>
        </>
      ) : null}
      {isFetched && errorMessage ? (
        <Error message={errorMessage} />
      ) : (
        errorMessage
      )}
    </section>
  );
};
