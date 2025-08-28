import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { whereAlpha2 } from "iso-3166-1";
import { z } from "zod/v4";
import { AppArgs } from "../../router";

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

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      location: z
        .object({
          city: z.string(),
          colo: z.string(),
          region: z.string(),
          country: z.string(),
          country_code: z.string(),
          postcode: z.string(),
          continent: z.string(),
        })
        .nullable(),
    }),
  })
  .meta({
    id: "GetMetaLocationResponse",
    description: "Response for the /api/meta/location endpoint",
  });

export const route = createRoute({
  method: "get",
  path: "/api/meta/location",
  tags: ["Meta"],
  summary: "Gets location information for a user.",
  hide: process.env.ENVIRONMENT !== "staging",
  description: "Returns location information based on the request's origin.",
  responses: {
    200: {
      description: "Location information",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
        },
      },
    },
  },
});

export type Route = typeof route;
export const handler: RouteHandler<typeof route, AppArgs> = async (c) => {
  const request = c.req.raw;
  const location = request.cf
    ? {
        city: request.cf.city as string,
        region: request.cf.region as string,
        country: translateCountry(request.cf.country as string),
        country_code: request.cf.country as string,
        continent: request.cf.continent as string,
        colo: request.cf.colo as string,
        postcode: request.cf.postalCode as string,
      }
    : null;

  return c.json(
    { success: true, data: { location } } as const satisfies z.infer<
      typeof SuccessResponseSchema
    >,
    200
  );
};

export default [route, handler] as const;
