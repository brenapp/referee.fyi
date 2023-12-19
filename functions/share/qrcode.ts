
import qrImage from "qr-image";

interface Env {
    INCIDENTS: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const search = new URL(context.request.url).searchParams;
    const code = search.get("code");

    if (!code) {
        return new Response("Invalid Code", { status: 400 });
    }

    return new Response(
        qrImage.imageSync(`https://referee.fyi/join/${code}`),
        {
            headers: {
                "Content-Type": "image/png"
            }
        }
    );
};