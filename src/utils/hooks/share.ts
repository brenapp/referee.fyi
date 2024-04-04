import { set } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "~utils/data/query";
import {
  acceptEventInvitation,
  createInstance,
  getEventInvitation,
  getShareId,
  getShareName,
  registerUser,
} from "~utils/data/share";

export function useShareProfile() {
  const [name, setName] = useState("");

  const query = useQuery({
    queryKey: ["share_name"],
    queryFn: getShareName,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      setName(query.data);
    }
  }, [query.data, query.isSuccess]);

  const persist = useCallback(async () => {
    await set("share_name", name);
    await registerUser(name);
    queryClient.invalidateQueries({ exact: true, queryKey: ["share_name"] });
  }, [name]);

  return { name, setName, persist };
}

export function useShareID() {
  return useQuery({
    queryKey: ["share_id"],
    queryFn: () => getShareId(),
  });
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
