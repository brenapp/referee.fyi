import { del, get, set } from "~utils/data/keyval";
import type {
  ShareResponse,
  User,
  APIRegisterUserResponseBody,
  APIPostCreateResponseBody,
  APIGetInvitationResponseBody,
  APIPutInvitationAcceptResponseBody,
  UserInvitation,
  APIPutInviteResponseBody,
  APIDeleteInviteResponseBody,
  APIGetShareDataResponseBody,
  APIPutIncidentResponseBody,
  APIPatchIncidentResponseBody,
  WebSocketSender,
  APIPutInvitationRequestResponseBody,
  APIGetInvitationRequestResponseBody,
  APIGetListShareInstance,
} from "@referee-fyi/share";
import { Incident } from "./incident";
import { queryClient } from "./query";
import { exportPublicKey, getSignRequestHeaders } from "./crypto";

export const URL_BASE =
  import.meta.env.VITE_REFEREE_FYI_SHARE_SERVER ?? "https://referee.fyi/api";

export async function getShareSessionID(): Promise<string> {
  let id = sessionStorage.getItem("share_session_id");

  if (id) {
    return id;
  }

  id = crypto.randomUUID();
  sessionStorage.setItem("share_session_id", id);

  return id;
}

export async function getShareProfile(): Promise<User> {
  const key = await exportPublicKey(false);
  const name = (await get<string>("share_name")) ?? "";

  return { key, name };
}

export async function saveShareProfile(profile: Omit<User, "key">) {
  return set("share_name", profile.name);
}

export async function getSender(): Promise<WebSocketSender> {
  const { name, key: id } = await getShareProfile();
  return { type: "client", id, name };
}

export async function signedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const request = new Request(input, init);
  const signatureHeaders = await getSignRequestHeaders(request);

  let headers: Headers;
  if (init?.headers) {
    headers = new Headers(init.headers);
  } else if (input instanceof Request) {
    headers = new Headers(input.headers);
  } else {
    headers = new Headers();
  }

  signatureHeaders.forEach((value, key) => headers.set(key, value));

  const id = await getShareSessionID();
  headers.set("X-Referee-FYI-Session", id);

  return fetch(request, {
    headers,
  });
}

export async function registerUser(
  profile: Omit<User, "key">
): Promise<ShareResponse<APIRegisterUserResponseBody>> {
  if (!profile.name) {
    return { success: false, reason: "bad_request", details: "No name" };
  }

  const url = new URL("/api/user", URL_BASE);
  url.searchParams.set("name", profile.name);

  const response = await signedFetch(url, {
    method: "POST",
  });

  return response.json();
}

export async function createInstance(
  sku: string
): Promise<ShareResponse<APIPostCreateResponseBody>> {
  const response = await signedFetch(new URL(`/api/${sku}/create`, URL_BASE), {
    method: "POST",
  });

  const body: ShareResponse<APIPostCreateResponseBody> = await response.json();

  if (body.success) {
    await set(`invitation_${sku}`, body.data);
    queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });
  }

  return body;
}

export async function fetchInvitation(sku: string) {
  try {
    const response = await signedFetch(
      new URL(`/api/${sku}/invitation`, URL_BASE),
      {
        method: "GET",
      }
    );

    const body: ShareResponse<APIGetInvitationResponseBody> =
      await response.json();

    if (!body.success) {
      return null;
    }

    return body;
  } catch (e) {
    return null;
  }
}

export async function getEventInvitation(
  sku: string
): Promise<UserInvitation | null> {
  const current = await get<APIGetInvitationResponseBody>(`invitation_${sku}`);

  if (current && current.accepted) {
    return current;
  }

  const body = await fetchInvitation(sku);

  if (!body || !body.success) {
    return null;
  }

  if (body.data.accepted) {
    await set(`invitation_${sku}`, body.data);
    queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });
  }

  return body.data;
}

export async function forceEventInvitationSync(sku: string) {
  await del(`invitation_${sku}`);
  queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });
}

export async function verifyEventInvitation(
  sku: string
): Promise<UserInvitation | null> {
  const response = await signedFetch(
    new URL(`/api/${sku}/invitation`, URL_BASE),
    {
      method: "GET",
    }
  );

  if (response.type !== "basic" && response.type !== "default") {
    return null;
  }

  const body: ShareResponse<APIGetInvitationResponseBody> =
    await response.json();

  if (!body.success && body.reason !== "server_error") {
    await del(`invitation_${sku}`);
    queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });
  }

  if (body.success && body.data.accepted) {
    await set(`invitation_${sku}`, body.data);
    queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });
    return body.data;
  }

  return null;
}

export async function acceptEventInvitation(
  sku: string,
  invitationId: string
): Promise<ShareResponse<APIPutInvitationAcceptResponseBody>> {
  const url = new URL(`/api/${sku}/accept`, URL_BASE);
  url.searchParams.set("invitation", invitationId);

  const response = await signedFetch(url, {
    method: "PUT",
  });

  const body: ShareResponse<APIPutInvitationAcceptResponseBody> =
    await response.json();

  if (!body.success && body.reason !== "server_error") {
    await del(`invitation_${sku}`);
    queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });
  }

  if (body.success) {
    await set(`invitation_${sku}`, body.data);
    queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });
  }

  return body;
}

export type InviteUserOptions = {
  admin: boolean;
};

export async function inviteUser(
  sku: string,
  user: string,
  options: InviteUserOptions
): Promise<ShareResponse<APIPutInviteResponseBody>> {
  const url = new URL(`/api/${sku}/invite`, URL_BASE);
  url.searchParams.set("user", user);

  if (options.admin) {
    url.searchParams.set("admin", "true");
  }

  const response = await signedFetch(url, { method: "PUT" });
  return response.json();
}

export async function removeInvitation(
  sku: string,
  user?: string
): Promise<ShareResponse<APIDeleteInviteResponseBody>> {
  const { key: id } = await getShareProfile();

  const url = new URL(`/api/${sku}/invite`, URL_BASE);
  url.searchParams.set("user", user ?? id);

  const response = await signedFetch(url, { method: "DELETE" });
  const body: ShareResponse<APIDeleteInviteResponseBody> =
    await response.json();

  await del(`invitation_${sku}`);
  queryClient.invalidateQueries({ queryKey: ["event_invitation", sku] });

  return body;
}

export async function getShareData(
  sku: string
): Promise<ShareResponse<APIGetShareDataResponseBody>> {
  const url = new URL(`/api/${sku}/get`, URL_BASE);

  const response = await signedFetch(url);
  return response.json();
}

export async function addServerIncident(
  incident: Incident
): Promise<ShareResponse<APIPutIncidentResponseBody>> {
  const url = new URL(`/api/${incident.event}/incident`, URL_BASE);

  const response = await signedFetch(url, {
    method: "PUT",
    body: JSON.stringify(incident),
  });
  return response.json();
}

export async function editServerIncident(
  incident: Incident
): Promise<ShareResponse<APIPatchIncidentResponseBody>> {
  const url = new URL(`/api/${incident.event}/incident`, URL_BASE);

  const response = await signedFetch(url, {
    method: "PATCH",
    body: JSON.stringify(incident),
  });
  return response.json();
}

export async function deleteServerIncident(
  id: string,
  sku: string
): Promise<ShareResponse<APIPatchIncidentResponseBody>> {
  const url = new URL(`/api/${sku}/incident`, URL_BASE);
  url.searchParams.set("id", id);

  const response = await signedFetch(url, {
    method: "DELETE",
  });
  return response.json();
}

export async function putRequestCode(
  sku: string
): Promise<ShareResponse<APIPutInvitationRequestResponseBody>> {
  const url = new URL(`/api/${sku}/request`, URL_BASE);
  url.searchParams.set("version", __REFEREE_FYI_VERSION__);

  const response = await signedFetch(url, { method: "PUT" });
  return response.json();
}

export async function getRequestCodeUserKey(
  sku: string,
  code: string
): Promise<ShareResponse<APIGetInvitationRequestResponseBody>> {
  const url = new URL(`/api/${sku}/request`, URL_BASE);
  url.searchParams.set("code", code);

  const response = await signedFetch(url, { method: "GET" });
  return response.json();
}

export async function getInstancesForEvent(
  sku: string
): Promise<ShareResponse<APIGetListShareInstance>> {
  const url = new URL(`/api/${sku}/list`, URL_BASE);
  const response = await signedFetch(url, { method: "GET" });

  return response.json();
}

export function getIntegrationAPIEndpoints(
  sku: string,
  query: { token: string; instance?: string }
) {
  const json = new URL(
    `/api/integration/v1/${sku}/incidents.json`,
    import.meta.env.VITE_REFEREE_FYI_SHARE_SERVER
  );

  const csv = new URL(
    `/api/integration/v1/${sku}/incidents.csv`,
    import.meta.env.VITE_REFEREE_FYI_SHARE_SERVER
  );

  const pdf = new URL(
    `/api/integration/v1/${sku}/incidents.pdf`,
    import.meta.env.VITE_REFEREE_FYI_SHARE_SERVER
  );

  if (query.token) {
    json.searchParams.set("token", query.token);
    csv.searchParams.set("token", query.token);
    pdf.searchParams.set("token", query.token);
  }

  if (query.instance) {
    json.searchParams.set("instance", query.instance);
    csv.searchParams.set("instance", query.instance);
    pdf.searchParams.set("instance", query.instance);
  }

  return { json, csv, pdf };
}
