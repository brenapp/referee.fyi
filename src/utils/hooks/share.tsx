import { get, set } from "idb-keyval";
import { PropsWithChildren, createContext, useContext, useEffect } from "react";
import { UseQueryOptions, useMutation, useQuery } from "react-query";
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

  const { data: name } = useShareName();

  useEffect(() => {
    if (event && code && name) {
      connection.setup(event.sku, code, { name });
    }
  }, [event, code]);

  return (
    <ShareContext.Provider value={connection}>{children}</ShareContext.Provider>
  );
};

export function useShareConnection() {
  return useContext(ShareContext);
}

export function useShareName() {
  const query = useQuery(["share_name"], async () => {
    return get<string>("share_name") ?? "";
  });

  const { mutateAsync } = useMutation(async (name: string) => {
    await set("share_name", name);
    queryClient.invalidateQueries("share_name");
  });

  return { ...query, setName: mutateAsync };
}

export function useCreateShare() {
  return useMutation(
    async (
      incidents: EventIncidents
    ): Promise<ShareResponse<CreateShareResponse>> => {
      return createShare(incidents);
    }
  );
}

export function useShareCode(sku: string | null | undefined) {
  return useQuery(["share_code", sku], async () => {
    if (!sku) {
      return null;
    }
    return get<string>(`share_${sku}`);
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
  return useQuery(
    ["share_data", sku, code],
    async () => {
      if (!sku || !code) {
        return null;
      }
      return getShareData(sku, code);
    },
    options
  );
}

export function useShareUserId() {
  return useQuery("share_user_id", async () => ShareConnection.getUserId());
}
