import type { Routes } from "~types/worker/sync";
import { signedFetch, URL_BASE } from "./share";

export async function getGeolocation(): Promise<
  Routes["/api/meta/location"]["get"]["data"]["location"] | null
> {
  const response = await signedFetch(new URL("/api/meta/location", URL_BASE));
  if (!response.ok) {
    null;
  }

  const body = (await response.json()) as Routes["/api/meta/location"]["get"];

  if (!body.success) {
    return null;
  }

  return body.data.location;
}
