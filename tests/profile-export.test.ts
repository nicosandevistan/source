import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { readCsv } from "@/lib/engine/profile/csv";
import { normalizeDate } from "@/lib/engine/profile/dates";
import { dedupe } from "@/lib/engine/profile/dedupe";
import {
  isProfileExportFile,
  parseExportFiles,
  pickExportFiles,
} from "@/lib/engine/profile/linkedin-export";
import { listFiles, read } from "./helpers/files";

const DIR = "tests/fixtures/linkedin-export";
const fixture = (name: string) => read(`${DIR}/${name}`);
const all = Object.fromEntries(
  listFiles(DIR).map((path) => [path.split("/").pop()!, read(path)]),
);

describe("date normalizing", () => {
  it.each([
    ["Jun 2026", "2026-06"],
    ["June 2026", "2026-06"],
    ["Sept 2025", "2025-09"],
    ["2024", "2024"],
    ["2024-03", "2024-03"],
    ["2024-03-15", "2024-03"],
    ["03/2024", "2024-03"],
    ["12 Jun 2026", "2026-06"],
    ["Jun 12, 2026", "2026-06"],
    ["Present", null],
    ["", null],
    ["2024-13", null],
    ["soon", null],
  ])("%s → %s", (input, expected) => {
    expect(normalizeDate(input)).toBe(expected);
  });
});

describe("CSV reading", () => {
  it("skips a notes preamble before the header", () => {
    const rows = readCsv(fixture("Connections.csv"), { company: ["Company"], first: ["First Name"] }, "company");
    expect(rows).toEqual([{ company: "Acme", first: "Sam" }]);
  });

  it("matches renamed columns in any order", () => {
    const rows = readCsv(
      "﻿start date,ORGANIZATION,Role\n2024,Acme,Intern\n",
      { company: ["Company Name", "Organization"], title: ["Title", "Role"], start: ["Started On", "Start Date"] },
      "company",
    );
    expect(rows).toEqual([{ company: "Acme", title: "Intern", start: "2024" }]);
  });

  it("returns empty strings for columns that are missing", () => {
    const rows = readCsv("Company Name\nAcme\n", { company: ["Company Name"], title: ["Title"] }, "company");
    expect(rows).toEqual([{ company: "Acme", title: "" }]);
  });

  it("returns nothing when the required column is absent", () => {
    expect(readCsv("A,B\n1,2\n", { company: ["Company Name"] }, "company")).toEqual([]);
    expect(readCsv("", { company: ["Company Name"] }, "company")).toEqual([]);
  });

  it("keeps commas and quotes inside quoted cells", () => {
    const rows = readCsv('Company Name,Title\n"Acme, Inc.","Analyst ""II"""\n', { company: ["Company Name"], title: ["Title"] }, "company");
    expect(rows).toEqual([{ company: "Acme, Inc.", title: 'Analyst "II"' }]);
  });
});

describe("LinkedIn export import", () => {
  const result = parseExportFiles(all);
  const byValue = (value: string) => result.entries.find((e) => e.value === value);

  it("reads positions as employers with dates and title", () => {
    expect(byValue("Northwind Biotech")).toMatchObject({
      type: "employer",
      start: "2026-06",
      end: "2026-08",
      details: "Strategy Intern · Boston",
      source: "linkedin_export",
      useForMatching: true,
    });
    expect(byValue("Example Consulting Group")).toMatchObject({ start: "2025-09", end: null });
  });

  it("separates college from high school", () => {
    expect(byValue("Example State University")).toMatchObject({
      type: "school",
      details: "Bachelor of Science · Consulting club",
    });
    expect(byValue("Riverbend High School")?.type).toBe("high_school");
  });

  it("reads languages and honors, spotting scholarships", () => {
    expect(byValue("Spanish")?.type).toBe("language");
    expect(byValue("Riverbend Memorial Scholarship")?.type).toBe("scholarship");
    expect(byValue("Dean's List")?.type).toBe("other");
  });

  it("imports skills switched off for matching", () => {
    expect(byValue("Excel")).toMatchObject({ type: "interest", useForMatching: false });
  });

  it("ignores the connections file", () => {
    expect(result.filesRead.map((f) => f.name)).not.toContain("Connections.csv");
    expect(result.entries.some((e) => e.value === "Acme")).toBe(false);
  });

  it("imports a ZIP that is missing most files without errors (M1 acceptance)", () => {
    const partial = parseExportFiles({ "Languages.csv": fixture("Languages.csv") });
    expect(partial.filesFailed).toEqual([]);
    expect(partial.entries.map((e) => e.value)).toEqual(["Spanish", "English"]);
    expect(parseExportFiles({})).toEqual({ entries: [], filesRead: [], filesFailed: [] });
  });

  it("tolerates renamed columns and empty files", () => {
    const renamed = parseExportFiles({
      "Positions.csv": "Organization,Role,Start Date,End Date\nAcme,Intern,2024-06,2024-08\n",
      "Education.csv": "",
      "Skills.csv": "Unexpected,Header\nx,y\n",
    });
    expect(renamed.filesFailed).toEqual([]);
    expect(renamed.entries).toHaveLength(1);
    expect(renamed.entries[0]).toMatchObject({ value: "Acme", details: "Intern", start: "2024-06" });
  });

  it("drops rows with no name", () => {
    const r = parseExportFiles({ "Positions.csv": "Company Name,Title\n,Intern\n  ,\n" });
    expect(r.entries).toEqual([]);
  });
});

describe("opening the export ZIP", () => {
  const zip = zipSync({
    "Positions.csv": strToU8(fixture("Positions.csv")),
    "Basic_LinkedInDataExport/Education.csv": strToU8(fixture("Education.csv")),
    "messages.csv": strToU8("FROM,TO,CONTENT\nme,you,private\n"),
    "Connections.csv": strToU8(fixture("Connections.csv")),
    "Rich_Media.csv": strToU8("x\n"),
  });

  it("picks only the profile files, including ones in a folder", () => {
    expect(Object.keys(pickExportFiles(zip)).sort()).toEqual([
      "Basic_LinkedInDataExport/Education.csv",
      "Positions.csv",
    ]);
  });

  it("never treats messages or connections as profile files", () => {
    expect(isProfileExportFile("messages.csv")).toBe(false);
    expect(isProfileExportFile("Connections.csv")).toBe(false);
    expect(isProfileExportFile("Positions.txt")).toBe(false);
    expect(isProfileExportFile("Positions.csv")).toBe(true);
  });

  it("parses what it picked", () => {
    const r = parseExportFiles(pickExportFiles(zip));
    expect(r.entries.map((e) => e.value).sort()).toEqual([
      "Example Consulting Group",
      "Example State University",
      "Northwind Biotech",
      "Riverbend High School",
    ]);
  });
});

describe("dedupe", () => {
  const draft = parseExportFiles({ "Positions.csv": fixture("Positions.csv") }).entries;

  it("skips entries the user already has, ignoring case and punctuation", () => {
    const fresh = dedupe(draft, [{ type: "employer", value: "northwind  biotech.", start_date: "2026-06" }]);
    expect(fresh.map((e) => e.value)).toEqual(["Example Consulting Group"]);
  });

  it("keeps a second stint at the same employer", () => {
    const fresh = dedupe(draft, [{ type: "employer", value: "Northwind Biotech", start_date: "2025-06" }]);
    expect(fresh).toHaveLength(2);
  });

  it("removes repeats within one import", () => {
    expect(dedupe([...draft, ...draft])).toHaveLength(2);
  });
});
