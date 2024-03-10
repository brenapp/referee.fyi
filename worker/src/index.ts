import { IRequest, Router, createCors, error, json } from "itty-router";
import { response } from "./utils";
import { CreateShareRequest, CreateShareResponse, ShareMetadata } from "../types/api";
import { EventIncidents } from "../types/EventIncidents";

interface Env {
    SHARES: KVNamespace;
    INCIDENTS: DurableObjectNamespace
}

export const { preflight, corsify } = createCors({
    origins: ["*"],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
});

function generateCode(components: number, componentLength: number): string {

    let output: string[] = [];

    for (let i = 0; i < components; i++) {
        const values = new Uint8Array(Math.ceil(componentLength / 2));
        crypto.getRandomValues(values);

        let string = "";
        for (const value of values) {
            string += value.toString(16).toUpperCase();
        }

        output.push(string);
    };
    return output.join("-");
};

const router = Router<IRequest, [Env]>();

router
    .all("*", preflight)
    .post("/api/create/:sku", async (request, env: Env) => {
        const sku = request.params.sku;

        if (!sku) {
            return response({
                success: false,
                reason: "bad_request",
                details: "Must supply SKU"
            })
        };

        try {
            const body = await request.json() as CreateShareRequest;
            const code = generateCode(2, 6);

            const kv: ShareMetadata = { ...body, code };
            await env.SHARES.put(`${sku}#${code}`, JSON.stringify(kv));

            // Initialize the Durable Object
            const id = env.INCIDENTS.idFromName(`${sku}#${code}`);
            const share = env.INCIDENTS.get(id);

            await share.fetch(`https://share/init`, {
                method: "POST",
                body: JSON.stringify(body)
            });

            return response<CreateShareResponse>({
                success: true,
                data: { code }
            });

        } catch (e) {
            return response({
                success: false,
                reason: "server_error",
                details: `${e}`
            })
        };
    })
    .all("/api/share/:sku/:code/:path+", async (request, env: Env) => {
        const sku = request.params.sku;
        const code = request.params.code;

        const entry = await env.SHARES.get(`${sku}#${code}`);

        if (!entry) {
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
        details: "unknown endpoint",
    }))

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        return router.handle(request, env).then(json).catch(error).then(corsify);
    }
}

export { EventIncidents } from "./incidents";