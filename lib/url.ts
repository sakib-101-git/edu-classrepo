/** Builds "/path?a=1&b=2", dropping empty values (for filter links). */
export function withParams(path: string, params: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

export function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}
