import { ShareAddRequestData, ShareAddResponseData, ShareGetResponseData, shareResponse } from "../../src/utils/data/share";

interface Env {
    INCIDENTS: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const search = new URL(context.request.url).searchParams;

    if (context.request.method !== "PUT") {
        return shareResponse({
            success: false,
            reason: "bad_request",
            details: "Incorrect Method"
        })
    };

    try {
        const body = await context.request.json<ShareAddRequestData>();

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

        const incidents = [...data.incidents, body.incident].filter(v => !!v && v.id)

        const updated = JSON.stringify({ ...data, incidents });
        await context.env.INCIDENTS.put(`${sku}#${code}`, updated, { expirationTtl: 60 * 60 * 24 });

        return shareResponse<ShareAddResponseData>({
            success: true,
            data: undefined,
        })
    } catch (e) {
        console.log(e);
        return shareResponse({ success: false, reason: "server_error", details: e.toString() })
    };
};