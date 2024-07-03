import { json } from "itty-router";
import { type ShareResponse } from "../../types/api";

export function response<T>(data: ShareResponse<T>, init?: ResponseInit) {
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

  return json(data, { status, ...init });
}
