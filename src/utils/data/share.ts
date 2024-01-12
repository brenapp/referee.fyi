import type { ShareResponse, CreateShareResponse, EventIncidents } from "~share/api";

export async function createShare(incidents: EventIncidents): Promise<ShareResponse<CreateShareResponse>> {
  try {
    const response = await fetch(new URL(`/api/share/${incidents.sku}`), {
      method: "POST",
      body: JSON.stringify(incidents)
    });
    return response.json();
  } catch (e) {
    return {
      success: false,
      reason: "bad_request",
      details: `${e}`
    }
  };
};
