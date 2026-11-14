import { findDateRange } from "./dates";
import { looksLikeLocation } from "./parse-linkedin-pdf";
import type { PdfLine } from "./pdf";
import { clean, orNull } from "./text";
import type { DraftEntry, EntryType } from "./types";

/**
 * Reads a one-column resume with plain rules, no language model.
 *
 * Resumes vary much more than LinkedIn's PDF, so this aims for "nothing
 * important missed" over "perfectly split": under each recognized heading,
 * every run of non-bullet lines becomes one entry (organization from the
 * first line, title from the second, dates from wherever they appear).
 * Everything is marked for review.
 */

type Kind = "education" | "work" | "activities" | "volunteer" | "honors" | "skills" | "skip";

const HEADINGS: [RegExp, Kind][] = [
  [/^(education|academic background)$/, "education"],
  [/^((work|professional|relevant|research|industry) )?(experience|employment)$/, "work"],
  [/^research$/, "work"],
  [/^(leadership|activities|involvement|extracurriculars?|campus involvement|leadership (and|&) activities|leadership experience|organizations)$/, "activities"],
  [/^(volunteer(ing)?|volunteer experience|community service|service)$/, "volunteer"],
  [/^(honors|awards|honors (and|&) awards|scholarships|awards (and|&) honors)$/, "honors"],
  [/^(skills|languages|additional( information)?|skills (and|&) interests|interests)$/, "skills"],
  [/^(projects|publications|certifications|coursework|relevant coursework|summary|objective|profile)$/, "skip"],
];

const BULLET = /^[•\-–*▪●◦‣·]\s*/;

function headingKind(line: string, afterFirstHeading: boolean): Kind | undefined {
  const t = clean(line).replace(/:$/, "").toLowerCase();
  const known = HEADINGS.find(([re]) => re.test(t))?.[1];
  if (known) return known;
  // Combined or unusual headings ("LEADERSHIP & PROJECTS").
  if (/\b(leadership|activities|involvement|extracurricular)/.test(t) && t.split(" ").length <= 5) return "activities";
  if (/\bexperience\b/.test(t) && t.split(" ").length <= 4) return "work";
  // Any other short all-capitals line with no dates is a heading we don't know: keep its entries, for review.
  // (Not before the first real heading, where the person's name often sits in capitals.)
  if (!afterFirstHeading) return undefined;
  const raw = clean(line).replace(/:$/, "");
  if (/^[A-Z][A-Z &/,-]{2,40}$/.test(raw) && raw.split(" ").length <= 5) return "activities";
  return undefined;
}

function schoolType(name: string): EntryType {
  if (/\b(high school|secondary school|preparatory|prep school|academy)\b/i.test(name)) return "high_school";
  if (/\b(university|college|institute|polytechnic|school of)\b/i.test(name)) return "school";
  return "program";
}

const isPlace = (p: string) => looksLikeLocation(p) || /^[A-Z][a-z]+(?: [A-Z][a-z]+)*,\s*[A-Z]{2}$/.test(p);

/**
 * Splits an organization line into the name and anything after it:
 * "Isenberg Consulting Group | Junior Analyst<TAB>Apr 2026" gives the name and
 * "Junior Analyst". Places (", City, ST") and leftover separators are dropped.
 */
function splitOrgLine(text: string): { name: string; rest: string | null } {
  const all = text.split(/\t|\s+\|\s+/).map(clean).filter(Boolean);
  // The first piece is the organization (even if it ends in ", City, ST");
  // later pieces that are only a place are dropped.
  const parts = [all[0] ?? "", ...all.slice(1).filter((p) => !isPlace(p))];
  // "Example State University, Amherst, MA" on one piece.
  const name = clean((parts[0] ?? "").replace(/,\s*[A-Z][a-zA-Z .]+,\s*[A-Z]{2}$/, "")).replace(/[\s,;|–-]+$/, "");
  const rest = parts.slice(1).join(" | ");
  return { name, rest: rest || null };
}

export function parseResume(lines: PdfLine[]): DraftEntry[] {
  const entries: DraftEntry[] = [];
  let kind: Kind | null = null;
  let group: string[] = [];
  // Left edge of organization lines. A wrapped bullet continues on an
  // indented line with no bullet mark; the indent is how it is told apart.
  let baseX: number | null = null;
  let inBullet = false;

  const flush = () => {
    if (kind && kind !== "skip" && kind !== "skills" && group.length) entries.push(...entriesFrom(kind, group));
    group = [];
  };

  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;
    const heading = headingKind(text, kind !== null);
    if (heading) {
      flush();
      kind = heading;
      inBullet = false;
      baseX = baseX === null ? line.x : Math.min(baseX, line.x);
      continue;
    }
    if (!kind || kind === "skip") continue;
    const indented = baseX !== null && line.x > baseX + 6;
    if (kind === "skills") {
      if (!indented) entries.push(...languagesFrom(text));
      continue;
    }
    if (BULLET.test(text)) {
      flush();
      inBullet = true;
      // A scholarship or award inside a bullet ("Honors: Riverbend Memorial Scholarship (...)").
      const award = /([A-Z][\w'.&-]*(?:\s+[A-Z][\w'.&-]*)*\s+(?:Scholarship|Fellowship|Scholars Program|Scholar))/.exec(text);
      if (award) entries.push(draft("scholarship", award[1], {}));
      continue;
    }
    // The rest of a wrapped bullet: indented, or starting in lower case with no dates.
    if (inBullet && (indented || (/^[a-z(]/.test(text) && !findDateRange(text)))) continue;
    inBullet = false;
    // A new organization line closes the previous group once that group has dates.
    if (group.length >= 2 || (group.length === 1 && findDateRange(group[0]) && findDateRange(text))) flush();
    group.push(text);
  }
  flush();
  return entries;
}

function entriesFrom(kind: Exclude<Kind, "skills" | "skip">, group: string[]): DraftEntry[] {
  let start: string | null = null;
  let end: string | null = null;
  const cleaned = group.map((line) => {
    const found = findDateRange(line);
    if (!found) return line;
    start ??= found.range.start;
    end ??= found.range.end;
    return found.rest;
  });
  const { name, rest } = splitOrgLine(cleaned[0] ?? "");
  if (!name || name.length > 90) return [];
  const second = cleaned[1] ? splitOrgLine(cleaned[1]).name || null : rest;

  const type: EntryType =
    kind === "education"
      ? schoolType(name)
      : kind === "work"
        ? "employer"
        : kind === "volunteer"
          ? "volunteer"
          : kind === "honors"
            ? /scholar/i.test(name)
              ? "scholarship"
              : "other"
            : "club";
  return [draft(type, name, { start, end, details: second })];
}

/** "Languages: English and Spanish (bilingual), Mandarin, French". */
function languagesFrom(line: string): DraftEntry[] {
  const m = /^languages?\s*[:\-–]\s*(.+)$/i.exec(line.trim());
  if (!m) return [];
  const LEVEL = /\b(both|native|fluent|bilingual|conversational|proficient|proficiency|basic|intermediate|advanced|elementary|working|limited|professional|heritage)\b/gi;
  const out: DraftEntry[] = [];
  // A level in brackets after "A and B (bilingual)" applies to both.
  for (const chunk of m[1].split(/[,;]/)) {
    const bracket = /\(([^)]*)\)/.exec(chunk)?.[1] ?? null;
    const bare = chunk.replace(/\([^)]*\)/g, " ");
    const trailing = bare.match(LEVEL)?.join(" ") ?? null;
    for (const part of bare.split(/\s+and\s+|\s*&\s*|\//i)) {
      const name = clean(part.replace(LEVEL, " "));
      if (!name || name.length > 30 || !/^[A-Z]/.test(name)) continue;
      out.push(draft("language", name, { details: bracket ?? trailing }));
    }
  }
  return out;
}

function draft(
  type: EntryType,
  value: string,
  extra: Partial<Pick<DraftEntry, "start" | "end" | "details">>,
): DraftEntry {
  return {
    type,
    value: clean(value),
    start: extra.start ?? null,
    end: extra.end ?? null,
    details: orNull(extra.details),
    source: "resume",
    useForMatching: true,
    needsReview: true,
  };
}
