import createBaseClient, {
  Client as BaseClient,
  ClientOptions as BaseClientOptions,
  FetchResponse,
  MaybeOptionalInit,
  Middleware,
} from "openapi-fetch";
import type { paths } from "../openapi.d.ts";

export type * from "../openapi.d.ts";

export type Authorization = {
  type: "bearer";
  token: string;
};

export type ClientOptions = {
  sku: string;
  authorization: Authorization;
} & Omit<BaseClientOptions, "baseUrl">;

export const BASE_URL = "https://referee.fyi/";

export const authMiddleware: (auth: Authorization) => Middleware = (auth) => ({
  async onRequest({ request }) {
    request.headers.set("Authorization", `Bearer ${auth.token}`);
    return request;
  },
});

export type ClientExtensions = {
  verify: () => Promise<
    FetchResponse<
      paths["/api/integration/v1/{sku}/verify"]["get"],
      MaybeOptionalInit<paths["/api/integration/v1/{sku}/verify"], "get">,
      "application/json"
    >
  >;
  getAllIncidents: () => Promise<
    FetchResponse<
      paths["/api/integration/v1/{sku}/incidents.json"]["get"],
      MaybeOptionalInit<
        paths["/api/integration/v1/{sku}/incidents.json"],
        "get"
      >,
      "application/json"
    >
  >;
  getAsset: (params: {
    id: string;
  }) => Promise<
    FetchResponse<
      paths["/api/integration/v1/{sku}/asset"]["get"],
      MaybeOptionalInit<paths["/api/integration/v1/{sku}/asset"], "get">,
      "application/json"
    >
  >;
};

export type Client = BaseClient<paths> & ClientExtensions;

export function createClient(options: ClientOptions): Client {
  const client = createBaseClient<paths>({
    ...options,
    baseUrl: BASE_URL,
  });
  client.use(authMiddleware(options.authorization));

  return {
    ...client,
    verify: () =>
      client.GET("/api/integration/v1/{sku}/verify", {
        params: { path: { sku: options.sku } },
      }),
    getAllIncidents: () =>
      client.GET("/api/integration/v1/{sku}/incidents.json", {
        params: { path: { sku: options.sku } },
      }),
    getAsset: ({ id }: { id: string }) =>
      client.GET("/api/integration/v1/{sku}/asset", {
        params: {
          query: { id },
          path: {
            sku: options.sku,
          },
        },
      }),
  };
}
