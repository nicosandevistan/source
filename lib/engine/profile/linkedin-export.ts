import { unzipSync, strFromU8 } from "fflate";
import { readCsv } from "./csv";
import { normalizeDate } from "./dates";
import { clean, orNull } from "./text";
import type { DraftEntry, EntryType } from "./types";

type Parser = (text: string) => DraftEntry[];

function entry(
  type: EntryType,
  value: string,
  rest: Partial<Pick<DraftEntry, "start" | "end" | "details" | "useForMatching">> = {},
): DraftEntry {
  return {
    type,
    value: clean(value),
    start: rest.start ?? null,
    end: rest.end ?? null,
    details: rest.details ?? null,
    source: "linkedin_export",
    useForMatching: rest.useForMatching ?? true,
    // Export rows are the user's own structured data, copied as-is.
    needsReview: false,
  };
}

function join(...parts: (string | null | undefined)[]): string | null {
  return orNull(parts.map(clean).filter(Boolean).join(" · "));
}

const START = ["Started On", "Start Date", "Start", "From"] as const;
const END = ["Finished On", "End Date", "End", "To"] as const;

const positions: Parser = (text) =>
  readCsv(
    text,
    {
      company: ["Company Name", "Company", "Organization", "Employer"],
      title: ["Title", "Position", "Role"],
      location: ["Location"],
      start: START,
      end: END,
    },
    "company",
  ).map((r) =>
    entry("employer", r.company, {
      start: normalizeDate(r.start),
      end: normalizeDate(r.end),
      details: join(r.title, r.location),
    }),
  );

const education: Parser = (text) =>
  readCsv(
    text,
    {
      school: ["School Name", "School", "Institution"],
      degree: ["Degree Name", "Degree"],
      notes: ["Notes", "Field Of Study"],
      activities: ["Activities", "Activities and Societies"],
      start: START,
      end: END,
    },
    "school",
  ).map((r) =>
    entry(/high school|secondary school|preparatory|\bprep\b/i.test(r.school) ? "high_school" : "school", r.school, {
      start: normalizeDate(r.start),
      end: normalizeDate(r.end),
      details: join(r.degree, r.notes, r.activities),
    }),
  );

const languages: Parser = (text) =>
  readCsv(text, { name: ["Name", "Language"], proficiency: ["Proficiency"] }, "name").map((r) =>
    entry("language", r.name, { details: orNull(r.proficiency) }),
  );

const volunteering: Parser = (text) =>
  readCsv(
    text,
    {
      org: ["Company Name", "Organization", "Organization Name"],
      role: ["Role", "Title"],
      cause: ["Cause"],
      start: START,
      end: END,
    },
    "org",
  ).map((r) =>
    entry("volunteer", r.org, {
      start: normalizeDate(r.start),
      end: normalizeDate(r.end),
      details: join(r.role, r.cause),
    }),
  );

const honors: Parser = (text) =>
  readCsv(
    text,
    { title: ["Title", "Name"], description: ["Description"], issued: ["Issued On", "Date"] },
    "title",
  ).map((r) =>
    entry(/scholar|fellow/i.test(r.title) ? "scholarship" : "other", r.title, {
      start: normalizeDate(r.issued),
      details: orNull(r.description),
    }),
  );

// Projects, skills, courses and certifications are rarely the basis of a
// good hook, so they import switched off; the user can turn any of them on.
const projects: Parser = (text) =>
  readCsv(text, { title: ["Title", "Name"], description: ["Description"], start: START, end: END }, "title").map(
    (r) =>
      entry("other", r.title, {
        start: normalizeDate(r.start),
        end: normalizeDate(r.end),
        details: orNull(r.description),
        useForMatching: false,
      }),
  );

const skills: Parser = (text) =>
  readCsv(text, { name: ["Name", "Skill"] }, "name").map((r) =>
    entry("interest", r.name, { details: "Skill", useForMatching: false }),
  );

const courses: Parser = (text) =>
  readCsv(text, { name: ["Name", "Course Name"], number: ["Number"] }, "name").map((r) =>
    entry("other", r.name, { details: join("Course", r.number), useForMatching: false }),
  );

const certifications: Parser = (text) =>
  readCsv(
    text,
    { name: ["Name"], authority: ["Authority", "Issuing Organization"], start: START, end: END },
    "name",
  ).map((r) =>
    entry("other", r.name, {
      start: normalizeDate(r.start),
      end: normalizeDate(r.end),
      details: join("Certification", r.authority),
      useForMatching: false,
    }),
  );

/** Export files that become profile entries, by normalized file name. */
const PARSERS: Record<string, Parser> = {
  positions,
  education,
  languages,
  volunteering,
  volunteeringexperiences: volunteering,
  honors,
  honorsandawards: honors,
  projects,
  skills,
  courses,
  certifications,
};

function fileKey(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? path;
  return base.replace(/\.csv$/i, "").toLowerCase().replace(/[^a-z]/g, "");
}

/** True for the export files the profile builder reads. Everything else stays on the user's device. */
export function isProfileExportFile(path: string): boolean {
  return /\.csv$/i.test(path) && fileKey(path) in PARSERS;
}

export type ExportResult = {
  entries: DraftEntry[];
  /** Files that were read, with how many entries each produced. */
  filesRead: { name: string; entries: number }[];
  /** Files that could not be read. One bad file never fails the import. */
  filesFailed: string[];
};

/** Parses the text of export CSVs, keyed by file name. Missing files are fine. */
export function parseExportFiles(files: Record<string, string>): ExportResult {
  const result: ExportResult = { entries: [], filesRead: [], filesFailed: [] };

  for (const [name, text] of Object.entries(files)) {
    const parser = PARSERS[fileKey(name)];
    if (!parser || !/\.csv$/i.test(name)) continue;
    try {
      const entries = parser(text).filter((e) => e.value !== "");
      result.entries.push(...entries);
      result.filesRead.push({ name, entries: entries.length });
    } catch {
      result.filesFailed.push(name);
    }
  }
  return result;
}

/**
 * Opens a LinkedIn data export ZIP and returns only the files the profile
 * builder reads. Messages, connections and everything else are never
 * decompressed.
 */
export function pickExportFiles(zip: Uint8Array): Record<string, string> {
  const unzipped = unzipSync(zip, { filter: (file) => isProfileExportFile(file.name) });
  return Object.fromEntries(
    Object.entries(unzipped).map(([name, bytes]) => [name, strFromU8(bytes)]),
  );
}
