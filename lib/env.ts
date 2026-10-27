// Runtime configuration shared by server and client code. Only NEXT_PUBLIC_*
// values may be read here; server secrets live in lib/server/env.ts.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const ALLOWED_EMAIL_DOMAIN = (
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "eastdelta.edu.bd"
).toLowerCase();

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Demo mode runs on in-memory sample data when Supabase is not configured.
 * It is never available in a production build: there, a missing Supabase
 * configuration is reported as an error instead.
 */
export const demoMode = !supabaseConfigured && process.env.NODE_ENV !== "production";
