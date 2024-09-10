import { AutoRouter } from "itty-router";
import { verifySignature } from "../utils/verify";
import { Env, SignedRequest } from "../types";
import { response } from "../utils/request";
import { APIRegisterUserResponseBody, User } from "@referee-fyi/share";
import { setUser } from "../utils/data";

const registrationRouter = AutoRouter({
  before: [verifySignature],
});

registrationRouter.post(
  "/api/user",
  async (request: SignedRequest, env: Env) => {
    const name = request.query.name;
    if (typeof name !== "string") {
      return response({
        success: false,
        reason: "bad_request",
        details: "Must specify name when registering ",
      });
    }

    const user: User = {
      key: request.keyHex,
      name,
    };

    await setUser(env, user);

    return response<APIRegisterUserResponseBody>({
      success: true,
      data: { user },
    });
  }
);

export { registrationRouter };
