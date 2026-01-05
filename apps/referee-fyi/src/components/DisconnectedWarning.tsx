import { isWorldsBuild, WORLDS_EVENTS } from "~utils/data/state";
import { Info, Warning } from "./Warning";
import { useCurrentEvent } from "~utils/hooks/state";
import { useEventInvitation } from "~utils/hooks/share";
import { useMemo } from "react";
import { useGeolocation } from "~utils/hooks/meta";

export const OfflineNotice: React.FC = () => {
  const { data: event } = useCurrentEvent();
  const { data: invitation } = useEventInvitation(event?.sku);
  const { error } = useGeolocation({
    staleTime: 0,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  if (!error) {
    return null;
  }

  if (!invitation) {
    return null;
  }

  return (
    <Info message="Offline Mode" className="mt-4">
      Referee FYI will continue to work normally, even when you are offline.
      When you reconnect, you will sync back up with your existing instance.
    </Info>
  );
};

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
