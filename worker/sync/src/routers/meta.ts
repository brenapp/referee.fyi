import { AutoRouter, IRequest } from "itty-router";
import { Env } from "../types";
import { response } from "../utils/request";
import { ApiGetMetaLocationResponseBody } from "@referee-fyi/share";
import { whereAlpha2 } from "iso-3166-1";

const COMMON_COUNTRIES = {
  US: "United States",
  CN: "China",
  CA: "Canada",
  AU: "Australia",
  GB: "United Kingdom",
  IE: "Ireland",
  NZ: "New Zealand",
  TW: "Taiwan",
  HK: "Hong Kong",
  MX: "Mexico",
};

/**
 * Translates the ISO-3166-1 alpha-2 country code to the country name that
 * RobotEvents returns. As far as I can tell, they are using the Google Maps
 * places API, for which the names do not match the ISO standard. This will call
 * out some exceptions, but will otherwise defer to iso-3166-1 full name.
 **/
function translateCountry(alpha2: string) {
  if (Object.hasOwn(COMMON_COUNTRIES, alpha2)) {
    return COMMON_COUNTRIES[alpha2 as keyof typeof COMMON_COUNTRIES];
  }

  const country = whereAlpha2(alpha2);
  if (country) {
    return country.country;
  }

  return alpha2;
}

const metaRouter = AutoRouter<IRequest & Request, [Env]>({
  before: [],
});

metaRouter.get("/api/meta/location", async (request: IRequest) => {
  const location = request.cf
    ? ({
        city: request.cf.city,
        region: request.cf.region,
        country: translateCountry(request.cf.country as string),
        country_code: request.cf.country,
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
