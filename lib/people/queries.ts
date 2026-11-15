import "server-only";
import { connection } from "next/server";
import type { Person, StoredEvidence } from "@/lib/engine/discovery/candidates";
import type { HookEntry } from "@/lib/engine/hooks/find";
import { createClient } from "@/lib/supabase/server";

export type EvidenceRow = { id: string; person_id: string; kind: "web" | "pasted"; url: string | null; domain: string | null };

/** Everyone the user has (light columns only) and their profile entries for hook finding. */
export async function getPeopleAndEntries(): Promise<{ people: Person[]; entries: HookEntry[]; connectionCount: number }> {
  await connection();
  const supabase = await createClient();
  const [people, entries] = await Promise.all([
    supabase.from("people").select("id, source, full_name, company, title, linkedin_url").order("full_name"),
    supabase
      .from("profile_entries")
      .select("id, type, value, aliases, start_date, end_date, est_group_size, use_for_matching"),
  ]);
  if (people.error || entries.error) throw new Error("Could not load people.");
  const list = (people.data ?? []) as Person[];
  return {
    people: list,
    entries: (entries.data ?? []) as HookEntry[],
    connectionCount: list.filter((p) => p.source === "connections").length,
  };
}

/** Unexpired evidence for the given people, with text. */
export async function getEvidence(personIds: string[]): Promise<{ rows: EvidenceRow[]; stored: StoredEvidence[] }> {
  if (personIds.length === 0) return { rows: [], stored: [] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evidence")
    .select("id, person_id, kind, url, domain, extracted_text")
    .in("person_id", personIds)
    .gt("expires_at", new Date().toISOString())
    .order("fetched_at");
  if (error) throw new Error("Could not load pages.");
  const rows = (data ?? []) as (EvidenceRow & { extracted_text: string })[];
  return {
    rows: rows.map((r) => ({ id: r.id, person_id: r.person_id, kind: r.kind, url: r.url, domain: r.domain })),
    stored: rows.map((r) => ({ id: r.id, personId: r.person_id, kind: r.kind, url: r.url, text: r.extracted_text })),
  };
}
