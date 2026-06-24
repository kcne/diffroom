import { getToken } from "./token";
import type { components } from "./api-types";

export interface Health {
  status: string;
  version: string;
  repo_root: string;
  branch: string;
}

export type DiffResponse = components["schemas"]["DiffResponse"];
export type DiffFile = components["schemas"]["DiffFile"];
export type Hunk = components["schemas"]["Hunk"];
export type Row = components["schemas"]["Row"];

/** Fetch wrapper that attaches the session token to every request. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(path, { ...init, headers });
}

export async function fetchHealth(): Promise<Health> {
  const response = await apiFetch("/api/health");
  if (!response.ok) {
    throw new Error(`health request failed: ${response.status}`);
  }
  return (await response.json()) as Health;
}

export async function fetchDiff(): Promise<DiffResponse> {
  const response = await apiFetch("/api/diff");
  if (!response.ok) {
    throw new Error(`diff request failed: ${response.status}`);
  }
  return (await response.json()) as DiffResponse;
}
