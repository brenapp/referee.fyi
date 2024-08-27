import { useMutation, useQuery } from "@tanstack/react-query";
import {
  acceptEventInvitation,
  createInstance,
  getEventInvitation,
} from "~utils/data/share";
import { exportPublicKey, signMessage } from "~utils/data/crypto";
import { useShareConnection } from "~models/ShareConnection";

export function useShareProfile() {
  const profile = useShareConnection((c) => c.profile);
  const persist = useShareConnection((c) => c.updateProfile);
  return { ...profile, persist };
}

export type UseCreateShareOptions = {
  sku: string;
};

export function useCreateInstance(sku: string) {
  return useMutation({
    mutationFn: () => createInstance(sku),
  });
}

export function useEventInvitation(sku?: string | null) {
  return useQuery({
    queryKey: ["event_invitation", sku],
    queryFn: () => {
      if (!sku) {
        return null;
      }
      return getEventInvitation(sku);
    },
    staleTime: 1000 * 60,
  });
}

export function useAcceptInvitation(sku: string, id: string) {
  return useMutation({
    mutationFn: () => acceptEventInvitation(sku, id),
  });
}

export function useIntegrationBearer(sku: string) {
  const { data: invitation, isSuccess: isEventInvitationSuccess } =
    useEventInvitation(sku);

  return useQuery({
    queryKey: ["integration_bearer", sku, invitation?.id],
    queryFn: async () => {
      if (!invitation) {
        return null;
      }

      if (!invitation.admin || !invitation.accepted) {
        return null;
      }

      const message = await signMessage(`${invitation.id}${invitation.sku}`);
      const keyHex = await exportPublicKey(true);

      return [keyHex, message].join("|");
    },
    enabled: isEventInvitationSuccess && !!invitation,
  });
}
