import { get, set } from "idb-keyval";
import { createContext } from "react";
import { useMutation, useQuery } from "react-query";
import { EventIncidents, ShareUser } from "~share/EventIncidents";
import { CreateShareResponse, ShareResponse } from "~share/api";
import { queryClient } from "~utils/data/query";
import { ShareConnection, createShare } from "~utils/data/share";

export const EventWebsocket = createContext<ShareConnection | null>(null);

export function useShareName() {
  const query = useQuery(["share_name"], async () => {
    return get<string>("share_name") ?? "";
  })

  const { mutateAsync } = useMutation(async (name: string) => {
    await set("share_name", name);
    queryClient.invalidateQueries("share_name");
  });

  return { ...query, setName: mutateAsync }
};

export function useCreateShare() {
  return useMutation(async (incidents: EventIncidents): Promise<ShareResponse<CreateShareResponse>> => {
    const response = await createShare(incidents);

    if (response.success) {
      await set(`share_code_${incidents.sku}`, response.data.code);
    };

    return response;
  });
};

export type JoinShareOptions = {
  sku: string;
  code: string;
  user: ShareUser;
};

export function useJoinShare() {
  return useMutation(({ sku, code, user }: JoinShareOptions) => {

    // Cleanup previous websocket (currently, only allowing one websocket connection at a time)



  });
};


export function useShareCode(sku: string | null | undefined) {
  return useQuery(["share_code", sku], async () => {
    if (!sku) {
      return null;
    }
    return get<string>(`share_code_${sku}`);
  });
};