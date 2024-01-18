
import { type ShareResponse } from "../types/api"

export const corsHeaders = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE"
});


export function response<T>(data: ShareResponse<T>, init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");

    for (const [header, value] of corsHeaders) {
        headers.set(header, value);
    }

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

    const response = new Response(JSON.stringify(data), { status, ...init, headers });
    return response;
}
