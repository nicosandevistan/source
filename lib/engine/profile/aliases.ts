import { profile } from "@/config/app";
import { ACRONYM_STOPWORDS, ALIAS_CATALOG } from "./alias-catalog";
import { clean, normalizeForMatch } from "./text";
import type { EntryType } from "./types";

/** Tidies a list of aliases: trims, removes repeats and the entry's own name, caps the count. */
export function tidyAliases(value: string, aliases: string[]): string[] {
  const seen = new Set([normalizeForMatch(value)]);
  const out: string[] = [];
  for (const alias of aliases) {
    const cleaned = clean(alias).slice(0, 120);
    const k = normalizeForMatch(cleaned);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(cleaned);
  }
  return out.slice(0, profile.MAX_ALIASES);
}

/** "Example State University" → "ESU". Only for names of three or more main words. */
export function acronymOf(name: string): string | null {
  const words = clean(name)
    .replace(/[,.]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !ACRONYM_STOPWORDS.has(w.toLowerCase()));
  if (words.length < 3 || words.some((w) => !/^[A-Z]/.test(w))) return null;
  return words.map((w) => w[0]).join("");
}

/** Spelling variants: "&" ↔ "and", a leading "The", company suffixes. */
function variants(name: string): string[] {
  const out: string[] = [];
  if (/\s&\s/.test(name)) out.push(name.replace(/\s&\s/g, " and "));
  else if (/\sand\s/i.test(name)) out.push(name.replace(/\sand\s/gi, " & "));
  if (/^the\s/i.test(name)) out.push(name.replace(/^the\s+/i, ""));
  const bare = name.replace(/,?\s+(inc|llc|ltd|co|corp|corporation|company|l\.?p)\.?$/i, "");
  if (bare !== name) out.push(bare);
  return out;
}

/**
 * Proposes alternate names for an entry from the built-in catalog plus a few
 * spelling rules. Free and instant; the user confirms before any are saved.
 */
export function suggestAliases(entry: { type: EntryType; value: string }): string[] {
  if (entry.type === "language" || entry.type === "hometown" || entry.type === "interest") return [];
  const key = normalizeForMatch(entry.value);
  const out: string[] = [];

  for (const group of ALIAS_CATALOG) {
    const names = group.names.map(normalizeForMatch);
    // Exact match on any name, or the entry contains a distinctive full name ("MIT ESP Splash program").
    const hit = names.includes(key) || group.names.some((n) => n.length >= 8 && ` ${key} `.includes(` ${normalizeForMatch(n)} `));
    if (hit) out.push(...group.names, ...(group.related ?? []));
  }

  out.push(...variants(entry.value));
  const acronym = acronymOf(entry.value);
  if (acronym && acronym.length >= 3) out.push(acronym);

  return tidyAliases(entry.value, out);
}
