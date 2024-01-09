import { IRequest, Router } from "itty-router";
import { response } from "./utils";
import { CreateShareResponse } from "../types/api";
import { EventIncidents } from "../types/EventIncidents";

interface Env {
    SHARES: KVNamespace;
    INCIDENTS: DurableObjectNamespace
}

const router = Router<IRequest, [Env]>();

router
    .post("/api/create/:sku", async (request, env: Env) => {
        const sku = request.params.sku;

        if (!sku) {
            return response({
                success: false,
                reason: "bad_request",
                details: "Must supply SKU"
            })
        };

        const body = await request.json() as EventIncidents;

        const base = crypto.randomUUID();
        const code = base.slice(0, 3).toUpperCase() + "-" + base.slice(3, 6).toUpperCase();

        await env.SHARES.put(`${sku}#${code}`, JSON.stringify(body));

        return response<CreateShareResponse>({
            success: true,
            data: { code }
        })

    })
    .all("/api/share/:sku/:code/:path+", (request, env: Env) => {
        const sku = request.params.sku;
        const code = request.params.code;

        console.log(sku, code);

        if (!env.SHARES.get(`${sku}#${code}`)) {
            return response({
                success: false,
                reason: "incorrect_code",
                details: "No share exists with that SKU and code!"
            })
        }

        const id = env.INCIDENTS.idFromName(`${sku}#${code}`);
        const share = env.INCIDENTS.get(id);

        const search = new URL(request.url).search;


        return share.fetch(`https://share/${request.params.path}${search}`, request)
    })
    .all("*", () => response({
        success: false,
        reason: "bad_request",
        details: "unknown endpoint"
    }))

export default {
    fetch(request: Request, env: Env): Promise<Response> {
        return router.handle(request, env)
    }
}

export { EventIncidents } from "./incidents";