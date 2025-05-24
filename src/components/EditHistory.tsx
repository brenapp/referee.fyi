import {
  BaseWithLWWConsistency,
  History,
  KeyRegister,
  LWWKeys,
} from "@referee-fyi/consistency";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { timeAgo } from "~utils/time";
import { Button } from "./Button";
import { Dialog, DialogBody, DialogHeader } from "./Dialog";
import { UserCircleIcon, ClockIcon } from "@heroicons/react/20/solid";
import { usePeerUserName } from "~utils/data/share";

export type EditHistoryItemProps<
  T extends Record<string, unknown>,
  K extends keyof T,
> = {
  register: KeyRegister<T, K>;
  i: number;
  currentValue: T[K];
  render?: (value: T[K]) => React.ReactNode;
};

export const EditHistoryItem = <
  T extends Record<string, unknown>,
  K extends keyof T,
>({
  register,
  i,
  render = (value) => JSON.stringify(value),
  currentValue,
}: EditHistoryItemProps<T, K>) => {
  const history = register.history[i] as History<T, K>;
  const to = register.history[i + 1]?.prev ?? currentValue;
  const user = usePeerUserName(history.peer);
  const date = new Date(history.instant);
  return (
    <section className="bg-zinc-700 p-2 rounded-md mb-4 grid gap-2 grid-cols-2">
      <p className="mr-4">
        <UserCircleIcon
          height={20}
          className="inline mr-2"
          aria-hidden="true"
        />
        <span className="sr-only">User: </span>
        {user}
      </p>
      <p>
        <ClockIcon height={20} className="inline mr-2" aria-hidden="true" />
        <span className="sr-only">Time: </span>
        {date.toLocaleTimeString()}
      </p>
      <p>
        <span>From </span>
        {render(history.prev)}
      </p>
      <p>
        <span>To </span>
        {render(to)}
      </p>
    </section>
  );
};

export type EditHistoryDialogProps<
  T extends BaseWithLWWConsistency,
  K extends LWWKeys<T>,
> = {
  open: boolean;
  onClose: () => void;
  value: T;
  valueKey: K;
  render?: (value: T[K]) => React.ReactNode;
};

const EditHistoryDialog = <
  T extends BaseWithLWWConsistency,
  K extends LWWKeys<T>,
>({
  open,
  onClose,
  value,
  valueKey,
  render,
}: EditHistoryDialogProps<T, K>) => {
  const consistency = value.consistency[valueKey] as KeyRegister<T, K>;
  return (
    <Dialog
      mode="modal"
      open={open}
      onClose={onClose}
      aria-label={`Edit History for ${valueKey}`}
    >
      <DialogHeader title="Edit History" onClose={onClose} />
      <DialogBody className="p-2">
        {consistency.history.map((history, i) => (
          <EditHistoryItem
            register={consistency}
            i={i}
            render={render}
            currentValue={value[valueKey]}
            key={history.instant}
          />
        ))}
      </DialogBody>
    </Dialog>
  );
};

export type EditHistoryProps<
  T extends BaseWithLWWConsistency,
  K extends LWWKeys<T>,
> = {
  value: T | null | undefined;
  valueKey: K;
  dirty?: boolean;
  className?: string;
  render?: (value: T[K]) => React.ReactNode;
};

export const EditHistory = <
  T extends BaseWithLWWConsistency,
  K extends LWWKeys<T>,
>({
  value,
  valueKey,
  dirty = false,
  className,
  render,
}: EditHistoryProps<T, K>) => {
  const consistency = value?.consistency[valueKey];
  const user = usePeerUserName(consistency?.peer);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!consistency || !value) {
    return (
      <div
        className={twMerge(
          "flex items-center justify-between mt-2 h-8",
          className
        )}
      ></div>
    );
  }

  return (
    <div
      className={twMerge("flex items-center justify-between mt-2", className)}
    >
      <p
        className={twMerge(
          "px-2 text-sm ",
          dirty
            ? "text-black italic bg-emerald-400 rounded-md"
            : "text-emerald-400"
        )}
      >
        {user ? `${user}, ` : ""}
        {timeAgo(new Date(consistency.instant))}
      </p>
      <EditHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        value={value}
        valueKey={valueKey}
        render={render}
      />
      <Button
        className="flex items-center w-max gap-2 py-1"
        onClick={() => setHistoryOpen(true)}
      >
        <ClockIcon height={20} />
        History
      </Button>
    </div>
  );
};
