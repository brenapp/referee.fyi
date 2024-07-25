import { BaseWithLWWConsistency, LWWKeys } from "@referee-fyi/consistency";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { useShareConnection } from "~models/ShareConnection";
import { timeAgo } from "~utils/time";

export type EditHistoryProps<
  T extends BaseWithLWWConsistency,
  K extends LWWKeys<T>,
> = {
  value: T;
  valueKey: K;
  dirty?: boolean;
  className?: string;
};

export const EditHistory = <
  T extends BaseWithLWWConsistency,
  K extends LWWKeys<T>,
>({
  value,
  valueKey,
  dirty = false,
  className,
}: EditHistoryProps<T, K>) => {
  const invitations = useShareConnection((state) => state.invitations);

  const consistency = value.consistency[valueKey];
  const user = useMemo(
    () => invitations.find((v) => v.user.key === consistency.peer),
    [invitations, consistency.peer]
  );

  return (
    <div
      className={twMerge(
        "px-2 text-sm",
        dirty ? "text-emerald-400 italic" : "",
        className
      )}
    >
      {user ? `${user.user.name}, ` : ""}
      {timeAgo(new Date(consistency.instant))}
    </div>
  );
};
