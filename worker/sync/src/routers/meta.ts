import { AutoRouter, IRequest } from "itty-router";
import { Env } from "../types";
import { response } from "../utils/request";
import { ApiGetMetaLocationResponseBody } from "@referee-fyi/share";

const metaRouter = AutoRouter<IRequest & Request, [Env]>({
  before: [],
});

metaRouter.get("/api/meta/location", async (request: IRequest) => {
  const location = request.cf
    ? ({
        city: request.cf.city,
        region: request.cf.region,
        country: request.cf.country,
        continent: request.cf.continent,
        colo: request.cf.colo,
        postcode: request.cf.postalCode,
      } as ApiGetMetaLocationResponseBody["location"])
    : null;

  return response<ApiGetMetaLocationResponseBody>({
    success: true,
    data: {
      location,
    },
  });
});

export { metaRouter };
