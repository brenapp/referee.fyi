import { set } from "idb-keyval";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "~utils/data/query";
import {
  ShareConnection,
  acceptEventInvitation,
  createInstance,
  getAllEventInvitations,
  getEventInvitation,
  getShareName,
  registerUser,
} from "~utils/data/share";

export const connection = new ShareConnection();
export const ShareContext = createContext(connection);

export function useShareConnection() {
  return useContext(ShareContext);
}

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
    queryFn: () => ShareConnection.getUserId()
  })
};

export type UseCreateShareOptions = {
  sku: string;
};

export function useCreateInstance(sku: string) {
  return useMutation({
    mutationFn: () => createInstance(sku)
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
  })
};

export function useAllEventInvitations(sku?: string | null) {
  return useQuery({
    queryKey: ["event_invitation_all", sku],
    queryFn: () => {
      if (!sku) {
        return null;
      }
      return getAllEventInvitations(sku);
    },
    staleTime: 1000 * 60,
    refetchOnMount: true,
  })
};

export function useAcceptInvitation(sku: string, id: string) {
  return useMutation({
    mutationFn: () => acceptEventInvitation(sku, id)
  });
};

export function useActiveUsers() {
  const connection = useShareConnection();

  const activeUsers = useQuery({
    queryKey: ["active_users", connection.sku],
    queryFn: () => connection.users,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 1000,
    refetchOnMount: true,
    networkMode: "always",
  });

  return activeUsers.data ?? [];
}
