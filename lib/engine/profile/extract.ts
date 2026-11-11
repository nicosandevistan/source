import { profile } from "@/config/app";
import { dedupe } from "./dedupe";
import { parseLinkedInPdf } from "./parse-linkedin-pdf";
import { parseResume } from "./parse-resume";
import type { PdfLine } from "./pdf";
import { appearsIn } from "./text";
import type { DraftEntry, EntrySource } from "./types";

export type ExtractionResult = {
  entries: DraftEntry[];
  /** Entries whose name could not be found in the source text. */
  flagged: number;
  truncated: boolean;
};

/**
 * Turns a profile PDF or resume into entries with plain rules (no language
 * model, so no cost). Every entry is checked against the source text in
 * code; one whose name is not there is kept for review but left out of
 * matching. Every entry is marked for review (spec 7.1).
 */
export function extractEntries(
  lines: PdfLine[],
  source: Extract<EntrySource, "linkedin_pdf" | "resume">,
): ExtractionResult {
  const parsed = source === "linkedin_pdf" ? parseLinkedInPdf(lines) : parseResume(lines);
  const text = lines.map((l) => l.text).join("\n");

  let flagged = 0;
  const entries: DraftEntry[] = [];
  for (const entry of dedupe(parsed)) {
    if (!entry.value) continue;
    const grounded = appearsIn(entry.value, text);
    if (!grounded) flagged += 1;
    entries.push({ ...entry, useForMatching: grounded, needsReview: true });
  }
  const truncated = entries.length > profile.MAX_ENTRIES_PER_IMPORT;
  return { entries: entries.slice(0, profile.MAX_ENTRIES_PER_IMPORT), flagged, truncated };
}
