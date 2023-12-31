import { ShareNewRequestData, ShareNewResponseData, shareResponse } from "../../src/utils/data/share";

interface Env {
    INCIDENTS: KVNamespace;
}

function generateCode() {
    const base = crypto.randomUUID();

    return base.slice(0, 3).toUpperCase() + "-" + base.slice(3, 6).toUpperCase();;
};

export const onRequest: PagesFunction<Env> = async (context) => {

    if (context.request.method !== "PUT") {
        return shareResponse({
            success: false,
            reason: "bad_request",
            details: "Incorrect Method"
        })
    };

    try {
        const body = await context.request.json<ShareNewRequestData>()

        const code = generateCode();
        const sku = body?.initial.sku;

        if (!sku) {
            return shareResponse({
                success: false,
                reason: "bad_request",
                details: "Malformed Request"
            })
        };

        await context.env.INCIDENTS.get(`${sku}#${code}`);
        await context.env.INCIDENTS.put(`${sku}#${code}`, JSON.stringify(body.initial), { expirationTtl: 60 * 60 * 24 });

        return shareResponse<ShareNewResponseData>({
            success: true,
            data: { code }
        })

    } catch (e) {
        return shareResponse({ success: false, reason: "server_error", details: e.toString() })
    };
};