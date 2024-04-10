import { IRequest, Router } from "itty-router";
import { AuthenticatedRequest, Env, User } from "../../types/server";
import { verifySignature } from "../utils/verify";
import { response } from "../utils/request";
import { setUser } from "../utils/data";
import { APIRegisterUserResponseBody } from "../../types/api";

const userBehaviorRouter = Router<IRequest, [Env]>();

userBehaviorRouter
  .all("*", verifySignature)
  .post("/api/user", async (request: AuthenticatedRequest, env: Env) => {
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
  });

export { userBehaviorRouter };
