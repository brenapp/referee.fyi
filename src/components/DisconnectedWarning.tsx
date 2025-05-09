import { isWorldsBuild, WORLDS_EVENTS } from "~utils/data/state";
import { Warning } from "./Warning";
import { useCurrentEvent } from "~utils/hooks/state";
import { useEventInvitation } from "~utils/hooks/share";
import { useMemo } from "react";

export const DisconnectedWarning: React.FC = () => {
  const { data: event } = useCurrentEvent();
  const { data: invitation } = useEventInvitation(event?.sku);
  const isSharing = useMemo(
    () => !!invitation && invitation.accepted,
    [invitation]
  );

  return isWorldsBuild() &&
    !isSharing &&
    WORLDS_EVENTS.includes(event?.sku ?? "") ? (
    <Warning message="Disconnected from Shared Instance." />
  ) : null;
};
