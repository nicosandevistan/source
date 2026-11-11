import { normalizeForMatch } from "./text";
import type { DraftEntry } from "./types";

type Keyed = { type: string; value: string; start?: string | null; start_date?: string | null };

/** Kinds where one person can hold several roles at different times, so dates tell entries apart. */
const DATED_TYPES = new Set(["employer", "volunteer", "club"]);

export function entryKey(e: Keyed): string {
  // A school, language or program appears once however its dates were written
  // (LinkedIn and a resume often disagree on them).
  const start = DATED_TYPES.has(e.type) ? (e.start ?? e.start_date ?? "") : "";
  return [e.type, normalizeForMatch(e.value), start].join("|");
}

/** Drops drafts that repeat each other or something the user already has. */
export function dedupe(drafts: DraftEntry[], existing: Keyed[] = []): DraftEntry[] {
  const seen = new Set(existing.map(entryKey));
  const out: DraftEntry[] = [];
  for (const draft of drafts) {
    const k = entryKey(draft);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(draft);
  }
  return out;
}
