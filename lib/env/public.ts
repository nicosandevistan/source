import { parsePublicEnv } from "./schema";

/**
 * Safe for the browser. NEXT_PUBLIC_ variables are inlined at build time,
 * so each one must be referenced by its full name here.
 */
export function publicEnv() {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
