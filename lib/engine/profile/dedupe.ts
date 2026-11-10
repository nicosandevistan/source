import { normalizeForMatch } from "./text";
import type { DraftEntry } from "./types";

type Keyed = { type: string; value: string; start?: string | null; start_date?: string | null };

export function entryKey(e: Keyed): string {
  return [e.type, normalizeForMatch(e.value), e.start ?? e.start_date ?? ""].join("|");
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
