import { type ShareResponse } from "../types/api"

export function response<T>(data: ShareResponse<T>, init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");

    let status = 200;
    if (data.success) {
        status = 200;
    } else {
        switch (data.reason) {
            case "bad_request": {
                status = 400;
                break;
            }
            case "server_error": {
                status = 500;
                break;
            }
            case "incorrect_code": {
                status = 400;
                break;
            }
        }
    }

    return new Response(JSON.stringify(data), { status, ...init, headers });
}
