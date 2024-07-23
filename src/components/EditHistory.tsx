import { BaseWithLWWConsistency, LWWKeys } from "@referee-fyi/consistency";
import { useMemo } from "react";
import { useShareConnection } from "~models/ShareConnection";

export type EditHistoryProps<
  T extends BaseWithLWWConsistency,
  K extends LWWKeys<T>,
> = {
  value: T;
  valueKey: K;
};

export const EditHistory = <
  T extends BaseWithLWWConsistency,
  K extends LWWKeys<T>,
>({
  value,
  valueKey,
}: EditHistoryProps<T, K>) => {
  const invitations = useShareConnection((state) => state.invitations);

  const peer = value.consistency[valueKey].peer;
  const user = useMemo(
    () => invitations.find((v) => v.user.key === peer),
    [invitations, peer]
  );

  return <div className="p-2 px-4 text-sm italic">{user?.user.name}</div>;
};
