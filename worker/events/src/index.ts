import { join } from "path";
import { Context, Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { cors } from "hono/cors";

const ROBOTEVENTS_URL = "https://www.robotevents.com/api/v2";

const prefixes = ["/api/v2", "/api/events"];
const routes = [
  "/events",
  "/events/{id}",
  "/events/{id}/teams",
  "/events/{id}/skills",
  "/events/{id}/awards",
  "/events/{id}/divisions/{div}/matches",
  "/events/{id}/divisions/{div}/finalistRankings",
  "/events/{id}/divisions/{div}/rankings",
  "/teams",
  "/teams/{id}",
  "/teams/{id}/events",
  "/teams/{id}/matches",
  "/teams/{id}/rankings",
  "/teams/{id}/skills",
  "/teams/{id}/awards",
  "/programs/{id}",
  "/programs",
  "/seasons",
  "/seasons/{id}",
  "/seasons/{id}/events",
];

const blockedQueryKeys = new Set(["myEvents", "myTeams"]);
function canUseCache(url: URL): boolean {
  return ![...url.searchParams.keys()].some((key) => blockedQueryKeys.has(key));
}

function getCanonicalResourceUrl(url: URL): URL | null {
  const pathname = url.pathname;
  for (const prefix of prefixes) {
    if (pathname.startsWith(prefix)) {
      const newPath = pathname.replace(prefix, "");
      const newUrl = new URL(ROBOTEVENTS_URL + newPath);
      newUrl.search = url.search;
      return newUrl;
    }
  }

  return null;
}
type AppArgs = {
  Bindings: Env;
};

async function handle(c: Context<AppArgs>) {
  const url = getCanonicalResourceUrl(new URL(c.req.url));
  if (!url) {
    return c.json({ error: "Not Found", code: 404 }, 404);
  }

  c.header("Cache-Control", "public, max-age=120, s-maxage=120");
  c.header("Vary", "Authorization");
  c.header("X-Canonical-URL", url.toString());

  const token =
    c.req.header("Authorization")?.replace("Bearer ", "") ??
    (await c.env.ROBOTEVENTS_TOKEN.get());

  const useCache = canUseCache(url);
  let cached: unknown = null;
  try {
    if (useCache) {
      cached = await c.env.robotevents.get(url.toString(), "json");
    }
  } catch (e) {
    console.error("Error fetching from cache", e);
  }

  if (cached) {
    return c.json(cached, 200);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    return c.json(
      json ?? { error: response.statusText, code: response.status },
      response.status as ContentfulStatusCode
    );
  }

  const data = await response.json();

  if (useCache) {
    c.env.robotevents.put(url.toString(), JSON.stringify(data), {
      expirationTtl: 60 * 2,
    });
  }

  return c.json(data, 200);
}

const app = new Hono<{ Bindings: Env }>();
app.use("*", cors());

const endpoints = prefixes.flatMap((prefix) =>
  routes.map((route) => join(prefix, route))
);

for (const endpoint of endpoints) {
  app.get(endpoint, handle);
}

app.all("*", (c) => c.json({ error: "Not Found", code: 404 }, 404));

export default {
  ...app,
} satisfies ExportedHandler<Env>;
