import "server-only";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProfileEntry } from "@/lib/engine/profile/types";

const ENTRY_COLUMNS =
  "id, type, value, aliases, start_date, end_date, details, est_group_size, source, use_for_matching, needs_review";

export type VoiceSample = { id: string; text: string };

/** Row Level Security limits both queries to the signed-in user's rows. */
export async function getProfile(): Promise<{ entries: ProfileEntry[]; voiceSamples: VoiceSample[] }> {
  // Supabase checks the session's expiry against the clock, so this must
  // run per request, never in a prerender (Next.js flags Date.now() there).
  await connection();
  const supabase = await createClient();
  const [entries, samples] = await Promise.all([
    supabase.from("profile_entries").select(ENTRY_COLUMNS).order("type").order("created_at"),
    supabase.from("voice_samples").select("id, text").order("created_at"),
  ]);
  if (entries.error) throw new Error("Could not load profile entries.");
  if (samples.error) throw new Error("Could not load voice samples.");
  return {
    entries: (entries.data ?? []) as ProfileEntry[],
    voiceSamples: (samples.data ?? []) as VoiceSample[],
  };
}
