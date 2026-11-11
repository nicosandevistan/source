import { findDateRange, isDateLine, isDurationLine } from "./dates";
import type { PdfLine } from "./pdf";
import { clean, orNull } from "./text";
import type { DraftEntry, EntryType } from "./types";

/**
 * Reads LinkedIn's "Save to PDF" layout with plain rules, no language model.
 *
 * The layout is fixed: section headings ("Experience", "Education",
 * "Languages", "Honors-Awards" and so on), and under Experience a block per
 * role of company, title, date line and location. Every entry is marked for
 * review because a rule-based reader can still split a line wrongly.
 */

type Section =
  | "skip"
  | "experience"
  | "education"
  | "languages"
  | "honors"
  | "certifications"
  | "publications"
  | "volunteering";

const HEADINGS: Record<string, Section> = {
  contact: "skip",
  "top skills": "skip",
  skills: "skip",
  summary: "skip",
  patents: "skip",
  projects: "skip",
  experience: "experience",
  education: "education",
  languages: "languages",
  "honors-awards": "honors",
  "honors & awards": "honors",
  certifications: "certifications",
  publications: "publications",
  "volunteer experience": "volunteering",
  volunteering: "volunteering",
};

const PAGE_FOOTER = /^page \d+ of \d+$/i;

export function headingOf(text: string): Section | undefined {
  return HEADINGS[clean(text).toLowerCase()];
}

/** "Boston, Massachusetts, United States", "Greater Boston", "Remote" and the like. */
export function looksLikeLocation(line: string): boolean {
  const t = line.trim();
  if (/^(remote|hybrid|on-site|united states)$/i.test(t)) return true;
  if (/\b(area|metropolitan|greater)\b/i.test(t) && t.split(" ").length <= 6) return true;
  if (/,\s*(inc|llc|ltd|co|corp|l\.?p)\.?$/i.test(t)) return false;
  return /^[A-Z][\w .'-]+,\s*[A-Z][\w .'-]+(,\s*[A-Z][\w .'-]+)?$/.test(t) && t.length <= 60;
}

/** A sentence from a job description rather than a name or title. */
function looksLikeSentence(line: string): boolean {
  const words = line.split(/\s+/).length;
  return line.length > 70 || (/[.!?:;]$/.test(line) && words >= 5) || /^[•\-–*▪●◦]/.test(line);
}

function schoolType(name: string): EntryType {
  if (/\b(high school|secondary school|preparatory|prep school|academy)\b/i.test(name)) return "high_school";
  if (/\b(university|college|institute of technology|polytechnic|school of)\b/i.test(name)) return "school";
  return "program";
}

function draft(
  type: EntryType,
  value: string,
  extra: Partial<Pick<DraftEntry, "start" | "end" | "details">> = {},
): DraftEntry {
  return {
    type,
    value: clean(value),
    start: extra.start ?? null,
    end: extra.end ?? null,
    details: orNull(extra.details),
    source: "linkedin_pdf",
    useForMatching: true,
    needsReview: true,
  };
}

export function parseLinkedInPdf(lines: PdfLine[]): DraftEntry[] {
  // Split into sections, dropping footers and anything before the first
  // heading of its column (the name, headline and location).
  const sections: { section: Section; lines: string[] }[] = [];
  for (const column of ["side", "main"] as const) {
    let current: { section: Section; lines: string[] } | null = null;
    for (const line of lines) {
      if (line.column !== column) continue;
      const text = clean(line.text.replace(/\t/g, " "));
      if (!text || PAGE_FOOTER.test(text)) continue;
      const heading = headingOf(text);
      if (heading) {
        current = { section: heading, lines: [] };
        sections.push(current);
      } else if (current) {
        current.lines.push(text);
      }
    }
  }

  const entries: DraftEntry[] = [];
  for (const { section, lines: body } of sections) {
    if (section === "experience" || section === "volunteering") entries.push(...parseRoles(body, section));
    else if (section === "education") entries.push(...parseEducation(body));
    else if (section === "languages") entries.push(...parseLanguages(body));
    else if (section === "honors") {
      for (const name of body) {
        entries.push(draft(/scholar/i.test(name) ? "scholarship" : /fellow/i.test(name) ? "program" : "other", name, {
          details: /scholar|fellow/i.test(name) ? null : "Honor or award",
        }));
      }
    } else if (section === "certifications") {
      for (const name of body) entries.push(draft("other", name, { details: "Certification" }));
    } else if (section === "publications") {
      for (const name of body) entries.push(draft("publication", name));
    }
  }
  return entries;
}

/**
 * Experience blocks. Each role ends at its date line; the lines since the
 * previous role hold, in order: the last role's location and description,
 * then (for a new company) the company name, maybe a total-tenure line, and
 * the title just above the dates.
 */
function parseRoles(body: string[], section: "experience" | "volunteering"): DraftEntry[] {
  const entries: DraftEntry[] = [];
  let company: string | null = null;
  let pending: string[] = [];

  for (const line of body) {
    if (!isDateLine(line)) {
      pending.push(line);
      continue;
    }
    const { range } = findDateRange(line)!;
    const lines = pending.filter((l) => !looksLikeSentence(l));
    pending = [];
    const title = lines.pop() ?? null;
    let before = lines.pop();
    if (before && isDurationLine(before)) before = lines.pop(); // company with several roles
    if (before && !looksLikeLocation(before)) company = before;
    else if (!company && title) {
      // No company found: keep the title so nothing is lost; the user fixes it in review.
      company = title;
    }
    if (!company) continue;
    entries.push(
      draft(section === "volunteering" ? "volunteer" : "employer", company, {
        start: range.start,
        end: range.end,
        details: title === company ? null : title,
      }),
    );
  }
  return entries;
}

/** Education: a school line, then an optional "Degree, Field · (2024 - 2028)" line. */
function parseEducation(body: string[]): DraftEntry[] {
  const entries: DraftEntry[] = [];
  const isDegreeLine = (line: string) =>
    /·/.test(line) ||
    /^\(.*\d{4}.*\)$/.test(line) ||
    /^(bachelor|master|doctor|associate|high school|diploma|certificate|ba\b|bs\b|b\.?a\.?\b|b\.?s\.?\b|ms\b|ma\b|mba\b|phd\b)/i.test(line);

  for (const line of body) {
    const last = entries.at(-1);
    if (last && isDegreeLine(line)) {
      const [degree, dates] = line.split(/\s*·\s*/);
      const found = findDateRange((dates ?? degree).replace(/[()]/g, ""));
      if (found) {
        last.start = found.range.start;
        last.end = found.range.end;
      }
      const details = dates !== undefined ? degree : found ? found.rest : degree;
      if (details && !/^\(.*\)$/.test(details)) last.details = orNull(details);
      continue;
    }
    entries.push(draft(schoolType(line), line));
  }
  return entries;
}

/** "Spanish (Native or Bilingual)" becomes Spanish, with the level as a note. */
function parseLanguages(body: string[]): DraftEntry[] {
  const entries: DraftEntry[] = [];
  for (const line of body) {
    const m = /^(.*?)\s*\(([^)]*)\)?$/.exec(line);
    if (m && m[1] === "" && entries.length) {
      entries.at(-1)!.details = orNull(m[2]);
      continue;
    }
    entries.push(draft("language", m ? m[1] : line, { details: m ? m[2] : null }));
  }
  return entries;
}
