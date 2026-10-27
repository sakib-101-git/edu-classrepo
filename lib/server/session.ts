import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import type { Viewer } from "@/lib/types";
import { getBackend } from "./backend";

export const getViewer = cache(async (): Promise<Viewer | null> => (await getBackend()).getViewer());

/** Only same-site relative paths, so `?next=` can't redirect off-site. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** For pages that need an account. Unfinished sign-ups go to /welcome first. */
export async function requireViewer(returnTo: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!viewer.onboarded) redirect(`/welcome?next=${encodeURIComponent(returnTo)}`);
  return viewer;
}

/** Admin pages. The database enforces this again on every query. */
export async function requireAdmin(returnTo: string): Promise<Viewer | null> {
  const viewer = await requireViewer(returnTo);
  return viewer.role === "admin" ? viewer : null;
}
