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
  AssetType,
  APIGetAssetUploadURLResponseBody,
  ApiGetAssetPreviewURLResponseBody,
  ApiGetAssetOriginalURLResponseBody,
  InvitationListItem,
} from "@referee-fyi/share";
import { Incident } from "./incident";
import { queryClient } from "./query";
import { exportPublicKey, getSignRequestHeaders } from "./crypto";
import { useShareConnection } from "~models/ShareConnection";
import { useMemo } from "react";

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

export type JoinRequest = {
  client_version: string;
  user: {
    name: string;
    key: string;
  };
};

export function isValidJoinRequest(
  value: Record<string, unknown>
): value is JoinRequest {
  const versionMatch = Object.hasOwn(value, "client_version");

  const hasUser =
    Object.hasOwn(value, "user") &&
    Object.hasOwn(value.user as Record<string, string>, "name") &&
    Object.hasOwn(value.user as Record<string, string>, "key") &&
    typeof (value.user as Record<string, string>).name === "string" &&
    typeof (value.user as Record<string, string>).key === "string";

  return versionMatch && hasUser;
}

export function getJoinRequest({ key, name }: User): JoinRequest {
  return { client_version: __REFEREE_FYI_VERSION__, user: { name, key } };
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

export type IntegrationAPICredentials = {
  token: string;
  instance?: string;
};

export function getIntegrationAPIEndpoints(
  sku: string,
  query: IntegrationAPICredentials
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

export function getIntegrationAPIUsersEndpoint(
  sku: string,
  query: IntegrationAPICredentials
) {
  const url = new URL(
    `/api/integration/v1/${sku}/users`,
    import.meta.env.VITE_REFEREE_FYI_SHARE_SERVER
  );

  if (query.token) {
    url.searchParams.set("token", query.token);
  }

  if (query.instance) {
    url.searchParams.set("instance", query.instance);
  }

  return url;
}

export function getIntegrationAPIDeleteIncidentEndpoint(
  sku: string,
  query: IntegrationAPICredentials
) {
  const url = new URL(
    `/api/integration/v1/${sku}/incident`,
    import.meta.env.VITE_REFEREE_FYI_SHARE_SERVER
  );

  if (query.token) {
    url.searchParams.set("token", query.token);
  }

  if (query.instance) {
    url.searchParams.set("instance", query.instance);
  }

  return url;
}

export type IntegrationUsersResponse = {
  invitations: InvitationListItem[];
  active: User[];
};

export async function getIntegrationAPIIncidents(
  sku: string,
  query: IntegrationAPICredentials
) {
  const { json: url } = getIntegrationAPIEndpoints(sku, query);

  const headers = new Headers();

  const id = await getShareSessionID();
  headers.set("X-Referee-FYI-Session", id);

  const response = await fetch(url, { headers });
  const data = (await response.json()) as ShareResponse<Incident[]>;

  if (!data.success) {
    return null;
  }

  return data.data;
}

export async function getIntegrationAPIUsers(
  sku: string,
  query: IntegrationAPICredentials
) {
  const url = getIntegrationAPIUsersEndpoint(sku, query);

  const headers = new Headers();

  const id = await getShareSessionID();
  headers.set("X-Referee-FYI-Session", id);

  const response = await fetch(url, { headers });
  const data =
    (await response.json()) as ShareResponse<IntegrationUsersResponse>;

  if (!data.success) {
    return null;
  }

  return data.data;
}

export async function deleteIntegrationAPIIncident(
  sku: string,
  incident: string,
  query: IntegrationAPICredentials
) {
  const url = getIntegrationAPIDeleteIncidentEndpoint(sku, query);
  url.searchParams.set("id", incident);

  const headers = new Headers();

  const id = await getShareSessionID();
  headers.set("X-Referee-FYI-Session", id);

  const response = await fetch(url, { method: "DELETE", headers });
  const data = (await response.json()) as ShareResponse<
    Record<string, unknown>
  >;

  if (!data.success) {
    return null;
  }

  return data.data;
}

export async function getAssetUploadURL(
  sku: string,
  id: string,
  type: AssetType
): Promise<ShareResponse<APIGetAssetUploadURLResponseBody>> {
  const url = new URL(`/api/${sku}/asset/upload_url`, URL_BASE);
  url.searchParams.set("id", id);
  url.searchParams.set("type", type);
  const response = await signedFetch(url, { method: "GET" });

  return response.json();
}

export async function uploadAsset(url: string, data: Blob) {
  const formData = new FormData();
  formData.append("file", data);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  return response.json();
}

export async function getAssetPreviewURL(
  sku: string,
  id: string
): Promise<ShareResponse<ApiGetAssetPreviewURLResponseBody>> {
  const url = new URL(`/api/${sku}/asset/preview_url`, URL_BASE);
  url.searchParams.set("id", id);
  const response = await signedFetch(url, { method: "GET" });

  return response.json();
}

export async function getAssetOriginalURL(
  sku: string,
  id: string
): Promise<ShareResponse<ApiGetAssetOriginalURLResponseBody>> {
  const url = new URL(`/api/${sku}/asset/url`, URL_BASE);
  url.searchParams.set("id", id);
  const response = await signedFetch(url, { method: "GET" });

  return response.json();
}

export function usePeerUserName(peer?: string) {
  const { profile, invitations } = useShareConnection([
    "invitations",
    "profile",
  ]);
  return useMemo(
    () =>
      peer === profile?.key
        ? profile?.name
        : invitations.find((v) => v.user.key === peer)?.user.name,
    [invitations, peer, profile?.key, profile?.name]
  );
}
