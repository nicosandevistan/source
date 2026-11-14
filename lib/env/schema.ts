import { z } from "zod";

/**
 * Environment variable schemas. This file is the only place that names
 * environment variables; nothing else reads process.env directly.
 *
 * Variables a later milestone needs are optional for now and become
 * required in the milestone that first uses them.
 */

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const serverEnvSchema = publicEnvSchema.extend({
  APP_BASE_URL: z.url(),
  // Milestone 1+
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  // Milestone 3+ (free tiers only; see DECISIONS.md, "Zero-cost build")
  HUNTER_API_KEY: z.string().min(1).optional(),
  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),
  // Milestone 4+
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  TOKEN_ENCRYPTION_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

type Source = Record<string, string | undefined>;

function parse<T extends z.ZodType>(schema: T, source: Source): z.infer<T> {
  // Treat empty strings (an unfilled .env line) as missing.
  const cleaned = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== ""),
  );
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const names = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    // Names only. Never put a value in an error message.
    throw new Error(`Missing or invalid environment variables: ${names}`);
  }
  return result.data;
}

export function parsePublicEnv(source: Source): PublicEnv {
  return parse(publicEnvSchema, source);
}

export function parseServerEnv(source: Source): ServerEnv {
  return parse(serverEnvSchema, source);
}
