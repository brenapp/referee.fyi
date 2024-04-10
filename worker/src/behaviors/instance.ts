import { IRequest, Router } from "itty-router";
import { Env, RequestHasInvitation } from "../../types/server";
import { verifyInvitation, verifySignature, verifyUser } from "../utils/verify";

const shareInstanceRouter = Router<IRequest, [Env]>();

shareInstanceRouter
  .all("*", verifySignature)
  .all("*", verifyUser)
  .all("*", verifyInvitation)
  .all("/api/:sku/:path+", async (request: RequestHasInvitation, env: Env) => {
    const id = env.INCIDENTS.idFromString(request.instance.secret);
    const stub = env.INCIDENTS.get(id);

    const search = new URL(request.url).search;

    const headers = new Headers(request.headers);

    // Pass extra informational headers to the Durable Object
    headers.set("X-Referee-Content", request.payload);
    headers.set("X-Referee-User-Name", request.user.name);
    headers.set("X-Referee-User-Key", request.user.key);

    return stub.fetch(`https://share/${request.params.path}${search}`, {
      method: request.method,
      headers,
    });
  });

export { shareInstanceRouter };
