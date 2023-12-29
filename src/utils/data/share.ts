/**
 * This file contains response types and shared utilities for the Share functions. Types from this
 * file can be consumed by the frontend for strong end-to-end typing
 **/

import { IncidentWithID } from "./incident";

export type ShareResponseSuccess<T> = {
  success: true;
  data: T;
};

export type ShareResponseFailureReason =
  | "bad_request"
  | "server_error"
  | "incorrect_code";

export type ShareResponseFailure = {
  success: false;
  reason: ShareResponseFailureReason;
  details: string;
};

export type ShareResponse<T> = ShareResponseSuccess<T> | ShareResponseFailure;

// Endpoint Response Types

// GET share/get
export type ShareGetResponseData = {
  sku: string;
  owner: string; // owner code
  incidents: IncidentWithID[];
};

// PUT share/net
export type ShareNewRequestData = {
  initial: ShareGetResponseData;
};
export type ShareNewResponseData = {
  code: string;
};

// PUT share/add
export type ShareAddRequestData = {
  incident: IncidentWithID;
};

export type ShareAddResponseData = undefined;

export function shareResponse<T>(data: ShareResponse<T>, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  let status = 200;
  if (data.success) {
    status = 200;
  } else {
    status = 400;
  }

  return new Response(JSON.stringify(data), { status, ...init, headers });
}
