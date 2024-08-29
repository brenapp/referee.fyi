import {
  BaseWithLWWConsistency,
  History,
  KeyRegister,
  LWWKeys,
} from "@referee-fyi/consistency";
import { useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useShareConnection } from "~models/ShareConnection";
import { timeAgo } from "~utils/time";
import { Button } from "./Button";
import { ClockIcon } from "@heroicons/react/24/outline";
import { Dialog, DialogBody, DialogHeader } from "./Dialog";

function usePeerUser(peer: string) {
  const { invitations } = useShareConnection(["invitations"]);
  return useMemo(
    () => invitations.find((v) => v.user.key === peer),
    [invitations, peer]
  );
}

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
  const user = usePeerUser(history.peer);
  const date = new Date(history.instant);
  return (
    <tr>
      <td>{date.toLocaleTimeString()}</td>
      <td>{user?.user.name}</td>
      <td>{render(history.prev)}</td>
      <td>{render(to)}</td>
    </tr>
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
    <Dialog mode="modal" open={open} onClose={onClose}>
      <DialogHeader title="Edit History" onClose={onClose} />
      <DialogBody className="p-2">
        <table className="w-full text-left table-fixed">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>From</th>
              <th>To</th>
            </tr>
          </thead>
          <tbody>
            {consistency.history.map((history, i) => (
              <EditHistoryItem
                register={consistency}
                i={i}
                render={render}
                currentValue={value[valueKey]}
                key={history.instant}
              />
            ))}
          </tbody>
        </table>
      </DialogBody>
    </Dialog>
  );
};

export type EditHistoryProps<
  T extends BaseWithLWWConsistency,
  K extends LWWKeys<T>,
> = {
  value: T;
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
  const consistency = value.consistency[valueKey];
  const user = usePeerUser(consistency.peer);

  const [historyOpen, setHistoryOpen] = useState(false);

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
        {user ? `${user.user.name}, ` : ""}
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
