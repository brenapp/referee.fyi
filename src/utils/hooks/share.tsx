import { get, set } from "idb-keyval";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { UseQueryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { EventIncidents } from "~share/EventIncidents";
import {
  CreateShareResponse,
  ShareResponse,
  WebSocketServerShareInfoMessage,
} from "~share/api";
import { queryClient } from "~utils/data/query";
import { ShareConnection, createShare, getShareData } from "~utils/data/share";
import { useCurrentEvent } from "./state";

const connection = new ShareConnection();
const ShareContext = createContext(connection);

export const ShareProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { data: event } = useCurrentEvent();
  const { data: code } = useShareCode(event?.sku);

  const { name } = useShareName();

  useEffect(() => {
    if (event && code && name) {
      connection.setup(event.sku, code, { name });
    }
  }, [event, code, name]);

  return (
    <ShareContext.Provider value={connection}>{children}</ShareContext.Provider>
  );
};

export function useShareConnection() {
  return useContext(ShareContext);
}

export function useShareName() {
  const [name, setName] = useState("");

  const query = useQuery({
    queryKey: ["share_name"],
    queryFn: async () => (await get<string>("share_name")) ?? "",
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      setName(query.data);
    }
  }, [query.data]);

  const persist = useCallback(async () => {
    await set("share_name", name);
    queryClient.invalidateQueries({ exact: true, queryKey: ["share_name"] });
  }, [name]);

  return { name, setName, persist };
}

export function useCreateShare() {
  return useMutation({
    mutationFn: async (
      incidents: EventIncidents
    ): Promise<ShareResponse<CreateShareResponse>> => {
      return createShare(incidents);
    },
  });
}

export function useShareCode(sku: string | null | undefined) {
  return useQuery({
    queryKey: ["share_code", sku],
    queryFn: async () => {
      if (!sku) {
        return null;
      }
      const value = await get<string>(`share_${sku}`);
      return value ?? null;
    },
    staleTime: 0,
  });
}

export function useShareData(
  sku: string | null | undefined,
  code: string | null | undefined,
  options?: Omit<
    UseQueryOptions<ShareResponse<WebSocketServerShareInfoMessage> | null>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["share_data", sku, code],
    queryFn: async () => {
      if (!sku || !code) {
        return null;
      }
      return getShareData(sku, code);
    },
    staleTime: 1000,
    networkMode: "online",
    ...options,
  });
}

export function useShareUserId() {
  return useQuery({
    queryKey: ["share_user_id"],
    queryFn: async () => ShareConnection.getUserId(),
  });
}

export function useActiveUsers() {
  const connection = useShareConnection();

  const activeUsers = useQuery({
    queryKey: ["active_users", connection.sku, connection.code],
    queryFn: () => connection.users,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 1000,
    refetchOnMount: true,
    networkMode: "always",
  });

  return activeUsers.data ?? [];
}
