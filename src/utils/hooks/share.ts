import { useMutation } from "react-query";
import { ShareNewRequestData, ShareNewResponseData, ShareResponse, ShareResponseFailure } from "~utils/data/share";

export function useNewEventShare() {
    return useMutation(async (body: ShareNewRequestData) => {
        try {
            const response = await fetch("/share/new", {
                method: "PUT",
                body: JSON.stringify(body)
            });

            return response.json() as Promise<ShareResponse<ShareNewResponseData>>
        } catch (e) {
            return {
                success: false,
                details: `${e}`,
                reason: "server_error"
            } as ShareResponseFailure;
        };
    });
}