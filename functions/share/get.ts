import { ShareGetResponseData, shareResponse } from "../../src/utils/data/share";

interface Env {
    INCIDENTS: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const search = new URL(context.request.url).searchParams;

    const sku = search.get("sku");
    const code = search.get("code");

    if (!sku || !code) {
        return shareResponse({
            success: false,
            reason: "bad_request",
            details: "Must supply SKU and Share Code"
        })
    };

    const data = await context.env.INCIDENTS.get<ShareGetResponseData>(`${sku}#${code}`, "json");

    if (data === null) {
        return shareResponse({
            success: false,
            reason: "incorrect_code",
            details: "Incorrect Share Code for that SKU"
        })
    };

    return shareResponse<ShareGetResponseData>({
        success: true,
        data
    })
};