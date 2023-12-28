import { imageSync } from "qr-image";

interface Env {
    INCIDENTS: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const search = url.searchParams;
    const code = search.get("code");


    if (!code) {
        return new Response("Invalid Code", { status: 400 });
    }

    const path = new URL(`/join/${code}`, url);
    return new Response(
        imageSync(path.href),
        {
            headers: {
                "Content-Type": "image/png"
            }
        }
    );
};