import { discovery, entryTypeToHookType, type HookType } from "@/config/app";
import { normalizeForMatch } from "@/lib/engine/profile/text";
import type { EntryType } from "@/lib/engine/profile/types";
import { nameMentions } from "./names";
import { isSensitive } from "./sensitive";

/**
 * Hook finding with code, not a language model (spec 7.5 step 3,
 * zero-cost). For each of the user's entries and its alternate names, look
 * for the name in a page about a person. When it appears within 300
 * characters of the person's name, the sentence around it becomes the quote.
 * Every hook then goes through verifyHook before anyone sees it.
 */

export type HookEntry = {
  id: string;
  type: EntryType;
  value: string;
  aliases: string[];
  start_date: string | null;
  end_date: string | null;
  est_group_size: number;
  use_for_matching: boolean;
};

export type Evidence = { id: string; text: string; url: string | null };
export type HookPerson = { fullName: string; company: string };

export type FoundHook = {
  entryId: string;
  entryValue: string;
  /** The name of the entry that matched (the value or an alias). */
  matched: string;
  hookType: HookType;
  quote: string;
  evidenceId: string;
  identityConfirmed: boolean;
  /** True when a year in the quote falls inside the entry's dates. */
  timeOverlap: boolean;
};

/** Entry names shorter than this match too much by chance ("AI", "BU"). */
const MIN_NAME_CHARS = 3;
/** Names this common say nothing on their own. */
const TOO_COMMON = new Set(["english", "research", "intern", "university", "college", "school", "program"]);

/** Splits text into sentences, keeping each sentence's start offset. */
function sentences(text: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  const re = /[^.!?\n]+(?:[.!?]+|\n|$)/g;
  for (const m of text.matchAll(re)) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const body = raw.trim();
    if (body) out.push({ start: (m.index ?? 0) + lead, end: (m.index ?? 0) + lead + body.length });
  }
  return out;
}

/** Character position of each normalized character in the original text. */
function normalizedIndex(text: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  let space = true;
  for (let i = 0; i < text.length; i += 1) {
    const ch = normalizeForMatch(text[i]);
    if (ch === "") {
      if (!space) {
        norm += " ";
        map.push(i);
        space = true;
      }
      continue;
    }
    for (const c of ch) {
      norm += c;
      map.push(i);
    }
    space = false;
  }
  return { norm, map };
}

function yearsIn(text: string): number[] {
  return [...text.matchAll(/\b(19[5-9]\d|20\d\d)\b/g)].map((m) => Number(m[1]));
}

function overlaps(quote: string, entry: HookEntry): boolean {
  const start = entry.start_date ? Number(entry.start_date.slice(0, 4)) : null;
  const end = entry.end_date ? Number(entry.end_date.slice(0, 4)) : start;
  if (!start) return false;
  return yearsIn(quote).some((y) => y >= start && y <= (end ?? start));
}

/** True when the page names the person's company (spec 7.5 step 4.3). */
export function mentionsIdentity(normalizedText: string, person: HookPerson, companyNames: string[] = []): boolean {
  const names = [person.company, ...companyNames].map(normalizeForMatch).filter((n) => n.length >= 3);
  return names.some((n) => ` ${normalizedText} `.includes(` ${n} `));
}

export function findHooks(
  person: HookPerson,
  evidence: Evidence,
  entries: HookEntry[],
  companyNames: string[] = [],
): FoundHook[] {
  const { norm, map } = normalizedIndex(evidence.text);
  const people = nameMentions(norm, person.fullName);
  if (people.length === 0) return [];
  const identityConfirmed = mentionsIdentity(norm, person, companyNames);
  const spans = sentences(evidence.text);
  const best = new Map<string, FoundHook>();

  for (const entry of entries) {
    if (!entry.use_for_matching) continue;
    for (const name of [entry.value, ...entry.aliases]) {
      const n = normalizeForMatch(name);
      if (n.length < MIN_NAME_CHARS || TOO_COMMON.has(n)) continue;
      // The person's own name is not an overlap.
      if (normalizeForMatch(person.fullName).includes(n)) continue;
      const padded = ` ${norm} `;
      for (let at = padded.indexOf(` ${n} `); at !== -1; at = padded.indexOf(` ${n} `, at + 1)) {
        const pos = at; // offset in norm (the leading space shifts by one, the padded index lines up)
        const near = people.some((p) => Math.abs(p - pos) <= discovery.NAME_PROXIMITY_CHARS);
        if (!near) continue;
        const original = map[Math.min(pos, map.length - 1)] ?? 0;
        const span = spans.find((s) => original >= s.start && original < s.end);
        if (!span) continue;
        const quote = evidence.text.slice(span.start, span.end).trim();
        if (quote.length > 600 || isSensitive(quote)) continue;
        const hook: FoundHook = {
          entryId: entry.id,
          entryValue: entry.value,
          matched: name,
          hookType: entryTypeToHookType[entry.type],
          quote,
          evidenceId: evidence.id,
          identityConfirmed,
          timeOverlap: overlaps(quote, entry),
        };
        const prev = best.get(entry.id);
        // Keep one quote per entry, preferring one with overlapping dates, then the shortest.
        if (!prev || (hook.timeOverlap && !prev.timeOverlap) || (hook.timeOverlap === prev.timeOverlap && quote.length < prev.quote.length)) {
          best.set(entry.id, hook);
        }
      }
    }
  }
  return [...best.values()];
}
