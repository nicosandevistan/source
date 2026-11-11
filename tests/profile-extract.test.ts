import { describe, expect, it } from "vitest";
import { hookTypes, profile } from "@/config/app";
import { acronymOf, suggestAliases, tidyAliases } from "@/lib/engine/profile/aliases";
import { findDateRange, isDateLine, isDurationLine } from "@/lib/engine/profile/dates";
import { dedupe } from "@/lib/engine/profile/dedupe";
import { extractEntries } from "@/lib/engine/profile/extract";
import { defaultGroupSize } from "@/lib/engine/profile/group-size";
import { looksLikeLocation } from "@/lib/engine/profile/parse-linkedin-pdf";
import { extractPdfLines, extractPdfText, type PdfLine } from "@/lib/engine/profile/pdf";
import { appearsIn, normalizeForMatch } from "@/lib/engine/profile/text";
import { ENTRY_TYPES } from "@/lib/engine/profile/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./helpers/files";

// Fixtures are written by scripts/make-test-pdfs.mjs (all names made up).
const fixture = (name: string) => new Uint8Array(readFileSync(join(ROOT, "tests/fixtures", name)));
const pick = (entries: { type: string; value: string; start: string | null; end: string | null; details: string | null }[]) =>
  entries.map(({ type, value, start, end, details }) => ({ type, value, start, end, details }));

const lines = (...texts: string[]): PdfLine[] =>
  texts.map((text) => ({ text, x: 0, page: 1, fontSize: 10, column: "main" as const }));

describe("text matching", () => {
  it("ignores case, accents, punctuation and line breaks", () => {
    expect(normalizeForMatch("  Café\nRÍO,  Inc. ")).toBe("cafe rio inc");
    expect(appearsIn("Northwind Biotech", "worked at NORTHWIND\n  biotech, 2026")).toBe(true);
  });

  it("matches whole words only", () => {
    expect(appearsIn("MIT", "summit program")).toBe(false);
    expect(appearsIn("MIT", "at MIT.")).toBe(true);
    expect(appearsIn("", "anything")).toBe(false);
  });
});

describe("dates in lines", () => {
  it("reads LinkedIn and resume date ranges", () => {
    expect(findDateRange("June 2026 - August 2026 (3 months)")).toEqual({
      range: { start: "2026-06", end: "2026-08" },
      rest: "",
    });
    expect(findDateRange("September 2025 - Present (1 year)")?.range).toEqual({ start: "2025-09", end: null });
    expect(findDateRange("Strategy Intern\tJun. 2026 – Aug. 2026")).toEqual({
      range: { start: "2026-06", end: "2026-08" },
      rest: "Strategy Intern",
    });
    expect(findDateRange("Expected May 2028")?.range).toEqual({ start: null, end: "2028-05" });
    expect(findDateRange("Summer 2025 - Fall 2025")?.range).toEqual({ start: "2025-06", end: "2025-09" });
    expect(findDateRange("Treasurer")).toBeNull();
  });

  it("tells date lines, tenure lines and locations apart", () => {
    expect(isDateLine("2023 - 2024 (1 year)")).toBe(true);
    expect(isDateLine("Barista")).toBe(false);
    expect(isDurationLine("1 year 3 months")).toBe(true);
    expect(isDurationLine("7 months")).toBe(true);
    expect(isDurationLine("Senior Analyst")).toBe(false);
    expect(looksLikeLocation("Boston, Massachusetts, United States")).toBe(true);
    expect(looksLikeLocation("Greater Boston Area")).toBe(true);
    expect(looksLikeLocation("Acme, Inc.")).toBe(false);
    expect(looksLikeLocation("Example Consulting Group")).toBe(false);
  });
});

describe("PDF reading", () => {
  it("separates LinkedIn's sidebar from the main column", async () => {
    const read = await extractPdfLines(fixture("sample-linkedin.pdf"));
    const side = read.filter((l) => l.column === "side").map((l) => l.text);
    const main = read.filter((l) => l.column === "main").map((l) => l.text);
    expect(side).toContain("Honors-Awards");
    expect(side).not.toContain("Jordan Rivera");
    expect(main).toContain("Experience");
    expect(main).not.toContain("Languages");
  });

  it("keeps a resume's right-aligned dates on the same line, after a tab", async () => {
    const text = await extractPdfText(fixture("sample-resume.pdf"));
    expect(text).toContain("Strategy Intern\tJun. 2026 - Aug. 2026");
  });
});

describe("LinkedIn PDF import (no language model)", () => {
  it("finds every position, school and sidebar entry, with nothing invented", async () => {
    const result = extractEntries(await extractPdfLines(fixture("sample-linkedin.pdf")), "linkedin_pdf");
    expect(pick(result.entries)).toEqual([
      { type: "language", value: "Spanish", start: null, end: null, details: "Native or Bilingual" },
      { type: "language", value: "Portuguese", start: null, end: null, details: "Limited Working" },
      { type: "scholarship", value: "Riverbend Memorial Scholarship", start: null, end: null, details: null },
      { type: "other", value: "Dean's List", start: null, end: null, details: "Honor or award" },
      { type: "employer", value: "Northwind Biotech", start: "2026-06", end: "2026-08", details: "Strategy Intern" },
      { type: "employer", value: "Example Consulting Group", start: "2026-03", end: null, details: "Senior Analyst" },
      { type: "employer", value: "Example Consulting Group", start: "2025-09", end: "2026-03", details: "Junior Analyst" },
      // A company name that wraps onto a second line is joined, not split.
      {
        type: "employer",
        value: "Riverside Institute for Science, Technology, and Engineering (previously RISE)",
        start: "2024-06",
        end: "2024-08",
        details: "Summer Scholar",
      },
      // A role continued after a page break, with a description line before the next company.
      { type: "employer", value: "Riverbend Coffee Co.", start: "2023", end: "2024", details: "Barista" },
      // A degree line that wraps is joined.
      {
        type: "school",
        value: "Example State University",
        start: "2024",
        end: "2028",
        details: "Bachelor of Science - BS, Economics and Statistics & Data Science",
      },
      { type: "program", value: "MIT Educational Studies Program", start: "2022", end: "2022", details: null },
      { type: "high_school", value: "Revere High School", start: null, end: null, details: null },
    ]);
    // The name, headline, location, summary, contact details and skills are not entries.
    const values = result.entries.map((e) => e.value).join(" | ");
    for (const left of ["Jordan Rivera", "Student at", "Revere, Massachusetts", "example.c", "Financial Modeling", "Page 1", "head of strategy", "Research Operations"]) {
      expect(values).not.toContain(left);
    }
    expect(result.flagged).toBe(0);
    expect(result.entries.every((e) => e.needsReview && e.useForMatching && e.source === "linkedin_pdf")).toBe(true);
  });

  it("also reads a one-column LinkedIn-style PDF", async () => {
    const result = extractEntries(await extractPdfLines(fixture("sample-profile.pdf")), "linkedin_pdf");
    expect(result.entries.map((e) => e.value)).toEqual([
      "Northwind Biotech",
      "Example Consulting Group",
      "Example State University",
      "Spanish",
      "Riverbend Memorial Scholarship",
    ]);
  });

  it("returns nothing for a PDF that is not a LinkedIn profile", () => {
    const result = extractEntries(lines("Quarterly report", "Revenue grew 4% this year."), "linkedin_pdf");
    expect(result.entries).toEqual([]);
  });
});

describe("resume import (no language model)", () => {
  it("finds schools, jobs, activities, awards and languages", async () => {
    const result = extractEntries(await extractPdfLines(fixture("sample-resume.pdf")), "resume");
    expect(pick(result.entries)).toEqual([
      { type: "school", value: "Example State University", start: null, end: "2028-05", details: "Bachelor of Science in Economics; GPA 3.6" },
      { type: "scholarship", value: "Riverbend Memorial Scholarship", start: null, end: null, details: null },
      { type: "high_school", value: "Revere High School", start: "2020", end: "2024", details: null },
      { type: "employer", value: "Northwind Biotech", start: "2026-06", end: "2026-08", details: "Strategy Intern" },
      { type: "employer", value: "Example Consulting Group", start: "2025-09", end: null, details: "Junior Analyst" },
      // "LEADERSHIP & PROJECTS" is read as an activities heading; "Org | Title" is split.
      { type: "club", value: "Latin American Business Society", start: "2025-01", end: null, details: "Treasurer" },
      { type: "club", value: "iGEM Example Team", start: "2023-12", end: "2024-08", details: "Vice President" },
      { type: "language", value: "English", start: null, end: null, details: "bilingual" },
      { type: "language", value: "Spanish", start: null, end: null, details: "bilingual" },
      { type: "language", value: "Portuguese", start: null, end: null, details: null },
      { type: "language", value: "French", start: null, end: null, details: null },
    ]);
    // Wrapped bullet lines (indented, no bullet mark) never become entries.
    const values = result.entries.map((e) => e.value).join(" | ");
    for (const left of ["Alex Smith", "GOseq", "competition (150+", "JORDAN"]) expect(values).not.toContain(left);
    expect(result.entries.every((e) => e.needsReview && e.source === "resume")).toBe(true);
  });

  it("skips bullet text, contact lines and sections it does not use", () => {
    const result = extractEntries(
      lines("JORDAN RIVERA", "jordan@example.com", "PROJECTS", "Stock screener", "EXPERIENCE", "Acme Labs\tJan 2024 - Present", "• Did things."),
      "resume",
    );
    expect(result.entries.map((e) => e.value)).toEqual(["Acme Labs"]);
  });

  it("drops the place and trailing punctuation from an organization line", () => {
    const result = extractEntries(lines("EXPERIENCE", "Acme Labs,\tBoston, MA", "Analyst\t2024 - 2025"), "resume");
    expect(pick(result.entries)).toEqual([
      { type: "employer", value: "Acme Labs", start: "2024", end: "2025", details: "Analyst" },
    ]);
  });
});

describe("merging duplicates across imports", () => {
  it("treats the same school with different dates as one entry, but keeps separate roles", () => {
    const base = { start: null, end: null, details: null, source: "resume" as const, useForMatching: true, needsReview: true };
    const fresh = dedupe(
      [
        { ...base, type: "school", value: "University of Massachusetts -Amherst", start: "2025" },
        { ...base, type: "employer", value: "Example Consulting Group", start: "2025-09" },
      ],
      [
        { type: "school", value: "University of Massachusetts Amherst", start_date: null },
        { type: "employer", value: "Example Consulting Group", start_date: "2026-03" },
      ],
    );
    expect(fresh.map((e) => e.type)).toEqual(["employer"]);
  });
});

describe("aliases (built-in catalog, no language model)", () => {
  it("suggests Educational Studies Program and its sub-programs for MIT ESP", () => {
    const aliases = suggestAliases({ type: "program", value: "MIT ESP" });
    expect(aliases).toEqual(expect.arrayContaining(["MIT Educational Studies Program", "Educational Studies Program", "Splash", "Spark", "HSSP"]));
    expect(aliases).not.toContain("MIT ESP");
  });

  it("works from the long name too, and ignores case", () => {
    expect(suggestAliases({ type: "program", value: "mit educational studies program" })).toContain("MIT ESP");
    expect(suggestAliases({ type: "affinity_org", value: "Association of Latino Professionals For America" })).toContain("ALPFA");
  });

  it("adds spelling variants and an acronym for long names", () => {
    expect(suggestAliases({ type: "employer", value: "Smith & Jones Advisors" })).toContain("Smith and Jones Advisors");
    expect(suggestAliases({ type: "employer", value: "Riverbend Coffee Co." })).toContain("Riverbend Coffee");
    expect(acronymOf("Example State University")).toBe("ESU");
    expect(acronymOf("University of Example")).toBeNull(); // too short once "of" is dropped
    expect(acronymOf("big lowercase name here")).toBeNull();
  });

  it("does not suggest names for languages, hometowns or interests", () => {
    expect(suggestAliases({ type: "language", value: "Spanish" })).toEqual([]);
    expect(suggestAliases({ type: "hometown", value: "Revere, MA" })).toEqual([]);
  });

  it("caps the number of aliases", () => {
    const many = Array.from({ length: 30 }, (_, i) => `Name ${i}`);
    expect(tidyAliases("X", many)).toHaveLength(profile.MAX_ALIASES);
  });
});

describe("group size defaults", () => {
  it("every entry type has a default from config", () => {
    for (const type of ENTRY_TYPES) {
      expect(defaultGroupSize(type)).toBeGreaterThan(0);
    }
    expect(defaultGroupSize("school")).toBe(hookTypes.college.defaultGroupSize);
    expect(defaultGroupSize("program")).toBe(hookTypes.small_program.defaultGroupSize);
    expect(defaultGroupSize("high_school")).toBe(hookTypes.high_school.defaultGroupSize);
  });
});
