import React, { useCallback, useId, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "~components/Button";
import { Input } from "~components/Input";
import { Error } from "~components/Warning";
import { useCurrentEvent } from "~hooks/state";

function isValidCode(code: string) {
  return !!code.match(/[A-Z0-9]{3}-[A-Z0-9]{3}/g);
}

export const EventJoinPage: React.FC = () => {
  const { data: event } = useCurrentEvent();
  const [params] = useSearchParams();

  const navigate = useNavigate();

  const [code, setCode] = useState(params.get("code") ?? "");

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
    </section>
  );
};
