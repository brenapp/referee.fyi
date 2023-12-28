import { get, set, del } from "idb-keyval";
import { useMutation, useQuery } from "react-query";
import { queryClient } from "~utils/data/query";
import {
  ShareNewRequestData,
  ShareNewResponseData,
  ShareResponse,
  ShareResponseFailure,
} from "~utils/data/share";

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
  return useMutation(async (body: ShareNewRequestData) => {
    try {
      const response = await fetch("/share/new", {
        method: "PUT",
        body: JSON.stringify(body),
      });

      const resp =
        (await response.json()) as ShareResponse<ShareNewResponseData>;

      if (resp.success) {
        await set(`share_${body.initial.sku}`, resp.data.code);
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

export function useStopEventShare() {
  return useMutation(async (sku: string) => {
    await del(`share_${sku}`);
    await queryClient.invalidateQueries({ queryKey: ["share_code"] });
  });
};
