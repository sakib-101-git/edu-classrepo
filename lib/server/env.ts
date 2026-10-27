import "server-only";

/** Server-only secret. Never import this module from client code. */
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
