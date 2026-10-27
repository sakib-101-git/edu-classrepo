import "server-only";

import { headers } from "next/headers";
import { supabaseConfigured } from "@/lib/env";
import { UserError } from "./backend";
import { createServiceClient } from "./supabase/client";

/**
 * Fixed-window rate limits for auth and upload actions.
 *
 * With SUPABASE_SERVICE_ROLE_KEY set, counters live in Postgres and are shared
 * by every server instance. Without it (demo mode, or a deployment that omits
 * the key) they fall back to process memory, which is per-instance and resets
 * on restart. Supabase Auth applies its own limits on top of these.
 */

const LIMITS = {
  "code:ip": { limit: 10, windowSeconds: 600 },
  "code:email": { limit: 4, windowSeconds: 600 },
  "verify:ip": { limit: 20, windowSeconds: 600 },
  "verify:email": { limit: 8, windowSeconds: 600 },
  "login:ip": { limit: 20, windowSeconds: 600 },
  "login:email": { limit: 8, windowSeconds: 600 },
  "upload:user": { limit: 30, windowSeconds: 3600 },
  "avatar:user": { limit: 10, windowSeconds: 3600 },
} as const;

export type LimitName = keyof typeof LIMITS;

const memory = new Map<string, { start: number; hits: number }>();

function consumeInMemory(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.start > windowSeconds * 1000) {
    memory.set(key, { start: now, hits: 1 });
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (now - v.start > 3_600_000) memory.delete(k);
    }
    return true;
  }
  entry.hits += 1;
  return entry.hits <= limit;
}

/**
 * Client IP as reported by the hosting platform. Vercel overwrites
 * x-forwarded-for / x-real-ip with the real client address, so they cannot be
 * spoofed there; behind another proxy, make sure it does the same.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** Throws a UserError when the limit for `name` + `subject` is exhausted. */
export async function enforceRateLimit(name: LimitName, subject: string): Promise<void> {
  const { limit, windowSeconds } = LIMITS[name];
  const key = `${name}:${subject.toLowerCase()}`;
  let allowed: boolean;

  const service = supabaseConfigured ? createServiceClient() : null;
  if (service) {
    const { data, error } = await service.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      // Fail open on infrastructure errors (Supabase Auth still limits auth
      // endpoints), but leave a trace in the server log.
      console.error("[rate-limit] counter unavailable:", error.message);
      allowed = consumeInMemory(key, limit, windowSeconds);
    } else {
      allowed = data === true;
    }
  } else {
    allowed = consumeInMemory(key, limit, windowSeconds);
  }

  if (!allowed) {
    const minutes = Math.ceil(windowSeconds / 60);
    throw new UserError(`Too many attempts. Please try again in about ${minutes} minutes.`);
  }
}
