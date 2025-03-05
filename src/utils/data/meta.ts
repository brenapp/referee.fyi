import {
  ApiGetMetaLocationResponseBody,
  ShareResponse,
} from "@referee-fyi/share";
import { signedFetch, URL_BASE } from "./share";

export async function getGeolocation(): Promise<
  ApiGetMetaLocationResponseBody["location"] | null
> {
  const response = await signedFetch(new URL("/api/meta/location", URL_BASE));
  if (!response.ok) {
    null;
  }

  const body =
    (await response.json()) as ShareResponse<ApiGetMetaLocationResponseBody>;

  if (!body.success) {
    return null;
  }

  return body.data.location;
}
