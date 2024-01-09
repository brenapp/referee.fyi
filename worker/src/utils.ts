import { type ShareResponse } from "../types/api"

export function response<T>(data: ShareResponse<T>, init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");

    let status = 200;
    if (data.success) {
        status = 200;
    } else {
        status = 400;
    }

    return new Response(JSON.stringify(data), { status, ...init, headers });
}
