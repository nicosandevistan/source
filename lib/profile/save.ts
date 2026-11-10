import "server-only";
import { dedupe } from "@/lib/engine/profile/dedupe";
import { defaultGroupSize } from "@/lib/engine/profile/group-size";
import type { DraftEntry } from "@/lib/engine/profile/types";
import { createClient } from "@/lib/supabase/server";

/** Saves new drafts for the signed-in user, skipping ones they already have. */
export async function saveDrafts(drafts: DraftEntry[]): Promise<{ added: number; skipped: number }> {
  const supabase = await createClient();
  const existing = await supabase.from("profile_entries").select("type, value, start_date");
  if (existing.error) throw new Error("Could not read existing entries.");

  const fresh = dedupe(drafts, existing.data ?? []);
  if (fresh.length > 0) {
    const { error } = await supabase.from("profile_entries").insert(
      fresh.map((d) => ({
        type: d.type,
        value: d.value,
        start_date: d.start,
        end_date: d.end,
        details: d.details,
        est_group_size: defaultGroupSize(d.type),
        source: d.source,
        use_for_matching: d.useForMatching,
        needs_review: d.needsReview,
      })),
    );
    if (error) throw new Error("Could not save entries.");
  }
  return { added: fresh.length, skipped: drafts.length - fresh.length };
}
