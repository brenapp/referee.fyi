import { get, set, del } from "idb-keyval";
import { UseQueryOptions, UseQueryResult, useMutation, useQuery } from "react-query";
import { queryClient } from "~utils/data/query";
import {
  ShareResponse,
  CreateShareRequest,

  ShareResponseFailure,
} from "~share/api";
import { createShare } from "~utils/data/share";

export function useOwnerCode() {
  return useQuery(["owner_code"], async () => {

    const code = await get<string>("owner_code");

    if (code) {
      return code;
    }

    const newCode = crypto.randomUUID();
    await set("owner_code", newCode);

    return newCode;
  });
};

export function useShareCode(sku: string) {
  return useQuery(["share_code", sku], async () => {
    const result = await get<string>(`share_${sku}`);

    if (!result) {
      return null;
    }

    return result;
  });
}

export function useNewEventShare() {
  return useMutation(async (body: CreateShareRequest) => {
    try {
      const resp = await createShare(body)

      if (resp.success) {
        await set(`share_${body.sku}`, resp.data.code);
        queryClient.invalidateQueries({ queryKey: ["share_code"] });
      }
    } catch (e) {
      return {
        success: false,
        details: `${e}`,
        reason: "server_error",
      } as ShareResponseFailure;
    }
  });
}

export type JoinShareOptions = {
  sku: string;
  code: string;
}

export function useJoinShare(onSuccess?: () => void) {
  return useMutation(async ({ sku, code }: JoinShareOptions) => {
    await set(`share_${sku}`, code);
    await updateFromRemote(sku);
    queryClient.invalidateQueries({ queryKey: ["share_code"] });
  }, { onSuccess });
};

export function useStopEventShare() {
  return useMutation(async (sku: string) => {
    await del(`share_${sku}`);
    await queryClient.invalidateQueries({ queryKey: ["share_code"] });
  });
};

export type UseShareDataOptions = Omit<UseQueryOptions<any, unknown, ShareResponse<ShareGetResponseData>, (string | null | undefined)[]>, "queryKey" | "queryFn">;

export function useShareData(sku: string | undefined | null, code: string, options?: UseShareDataOptions): UseQueryResult<ShareResponse<ShareGetResponseData>> {
  return useQuery(["share_data", sku, code], async () => {
    if (!sku) {
      return;
    }

    const url = new URL("/share/get", window.location.origin);
    url.searchParams.set("sku", sku);
    url.searchParams.set("code", code);
    return fetch(url).then(r => r.json())
  }, options);
};
