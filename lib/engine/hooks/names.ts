import { normalizeForMatch } from "@/lib/engine/profile/text";

/**
 * Where a person is named in normalized text: the full name, or the last
 * name with the first initial next to it ("J. Rivera", "Rivera, J."), per
 * spec 7.5 step 4.2. Returns character offsets in the normalized text.
 */
export function nameMentions(normalizedText: string, fullName: string): number[] {
  const parts = normalizeForMatch(fullName).split(" ").filter(Boolean);
  if (parts.length < 2) return [];
  const first = parts[0];
  const last = parts.at(-1)!;
  const hits: number[] = [];
  const padded = ` ${normalizedText} `;

  const add = (re: RegExp) => {
    for (const m of padded.matchAll(re)) hits.push(Math.max(0, (m.index ?? 0)));
  };
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Full name, allowing a middle name or initial between first and last.
  add(new RegExp(` ${esc(first)} (?:[a-z]+ )?${esc(last)} `, "g"));
  // First initial + last name, or last name + first initial.
  add(new RegExp(` ${esc(first[0])} ${esc(last)} `, "g"));
  add(new RegExp(` ${esc(last)} ${esc(first[0])} `, "g"));
  return [...new Set(hits)].sort((a, b) => a - b);
}
