import { ShareResponse } from "@referee-fyi/share";
import { cors, json } from "itty-router";

export const { preflight, corsify } = cors();

export function response<T>(
  data: ShareResponse<T>,
  init?: ResponseInit
): Response {
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

  return json(data, {
    status,
    ...init,
  });
}
