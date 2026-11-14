/**
 * Lowercase, fold accents and reduce every run of non-letters/digits to one
 * space, so text can be compared without tripping on line breaks or
 * punctuation.
 */
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** True when `needle` appears in `haystack` as whole words. */
export function appearsIn(needle: string, haystack: string): boolean {
  const n = normalizeForMatch(needle);
  if (!n) return false;
  return ` ${normalizeForMatch(haystack)} `.includes(` ${n} `);
}

export function clean(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function orNull(value: string | null | undefined): string | null {
  const cleaned = clean(value);
  return cleaned === "" ? null : cleaned;
}
