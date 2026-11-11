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

function headingKind(line: string): Kind | undefined {
  const t = clean(line).replace(/:$/, "").toLowerCase();
  return HEADINGS.find(([re]) => re.test(t))?.[1];
}

function schoolType(name: string): EntryType {
  if (/\b(high school|secondary school|preparatory|prep school|academy)\b/i.test(name)) return "high_school";
  if (/\b(university|college|institute|polytechnic|school of)\b/i.test(name)) return "school";
  return "program";
}

/** Drops ", City, ST" style places and leftover separators from an organization line. */
function stripPlace(text: string): string {
  const parts = text.split(/\t|\s+\|\s+/).map(clean).filter(Boolean);
  const kept = parts.filter((p) => !looksLikeLocation(p) && !/^[A-Z][a-z]+(?: [A-Z][a-z]+)*,\s*[A-Z]{2}$/.test(p));
  let name = kept[0] ?? parts[0] ?? "";
  // "Example State University, Amherst, MA" on one piece.
  name = name.replace(/,\s*[A-Z][a-zA-Z .]+,\s*[A-Z]{2}$/, "");
  return clean(name).replace(/[\s,;|–-]+$/, "");
}

export function parseResume(lines: PdfLine[]): DraftEntry[] {
  const entries: DraftEntry[] = [];
  let kind: Kind | null = null;
  let group: string[] = [];

  const flush = () => {
    if (kind && kind !== "skip" && kind !== "skills" && group.length) entries.push(...entriesFrom(kind, group));
    group = [];
  };

  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;
    const heading = headingKind(text);
    if (heading) {
      flush();
      kind = heading;
      continue;
    }
    if (!kind || kind === "skip") continue;
    if (kind === "skills") {
      entries.push(...languagesFrom(text));
      continue;
    }
    if (BULLET.test(text)) {
      flush();
      // A scholarship or award inside a bullet ("Riverbend Memorial Scholarship recipient").
      const award = /([A-Z][\w'.&-]*(?:\s+[A-Z][\w'.&-]*)*\s+(?:Scholarship|Fellowship|Scholars Program|Scholar))/.exec(text);
      if (award) entries.push(draft("scholarship", award[1], {}));
      continue;
    }
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
  const name = stripPlace(cleaned[0] ?? "");
  if (!name || name.length > 90) return [];
  const second = cleaned[1] ? stripPlace(cleaned[1]) : null;

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

/** "Languages: Spanish (native), Portuguese (conversational)". */
function languagesFrom(line: string): DraftEntry[] {
  const m = /^languages?\s*[:\-–]\s*(.+)$/i.exec(line.trim());
  if (!m) return [];
  return m[1]
    .split(/[,;]/)
    .map((part) => /^\s*([^()]+?)\s*(?:\(([^)]*)\))?\s*$/.exec(part))
    .filter((p): p is RegExpExecArray => p !== null && p[1].length <= 30)
    .map((p) => draft("language", p[1], { details: p[2] ?? null }));
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
