import { DiffResult } from "./types";

const BASE = "/api";

export async function fetchVersions(pkg: string): Promise<string[]> {
  const res = await fetch(`${BASE}/packages/${encodeURIComponent(pkg)}/versions`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.versions as string[];
}

export async function fetchDiff(pkg: string, v1: string, v2: string): Promise<DiffResult> {
  const res = await fetch(
    `${BASE}/packages/${encodeURIComponent(pkg)}/diff/${encodeURIComponent(v1)}/${encodeURIComponent(v2)}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<DiffResult>;
}
