import { describe, expect, it } from "vitest";
import { hookTypes, models, profile } from "@/config/app";
import { ALIAS_SYSTEM, suggestAliases, tidyAliases } from "@/lib/engine/profile/aliases";
import { extractEntries, EXTRACTION_SYSTEM } from "@/lib/engine/profile/extract";
import { defaultGroupSize } from "@/lib/engine/profile/group-size";
import { extractPdfText } from "@/lib/engine/profile/pdf";
import { appearsIn, normalizeForMatch } from "@/lib/engine/profile/text";
import { ENTRY_TYPES } from "@/lib/engine/profile/types";
import { fixtureLlm } from "@/lib/llm/fixture";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./helpers/files";

const pdf = () => new Uint8Array(readFileSync(join(ROOT, "tests/fixtures/sample-profile.pdf")));

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

describe("PDF text", () => {
  it("extracts the text of a profile PDF", async () => {
    const text = await extractPdfText(pdf());
    expect(text).toContain("Northwind Biotech");
    expect(text).toContain("Riverbend Memorial Scholarship");
  });
});

describe("LLM extraction", () => {
  const reply = {
    entries: [
      { type: "employer", value: "Northwind Biotech", start: "June 2026", end: "August 2026", details: "Strategy Intern" },
      { type: "employer", value: "Example Consulting Group", start: "September 2025", end: "Present", details: "Junior Analyst" },
      { type: "school", value: "Example State University", start: "2024", end: "2028", details: " " },
      { type: "scholarship", value: "Riverbend Memorial Scholarship", start: null, end: null, details: null },
      // Invented: this name is nowhere in the PDF.
      { type: "employer", value: "Globex Capital", start: null, end: null, details: "Analyst" },
      { type: "other", value: "   ", start: null, end: null, details: null },
    ],
  };

  it("maps the reply to entries and checks each against the source text", async () => {
    const { client, calls } = fixtureLlm(reply);
    const text = await extractPdfText(pdf());
    const result = await extractEntries(client, text, "linkedin_pdf");

    expect(result.entries.map((e) => e.value)).toEqual([
      "Northwind Biotech",
      "Example Consulting Group",
      "Example State University",
      "Riverbend Memorial Scholarship",
      "Globex Capital",
    ]);
    expect(result.entries[0]).toMatchObject({
      type: "employer",
      start: "2026-06",
      end: "2026-08",
      details: "Strategy Intern",
      source: "linkedin_pdf",
      useForMatching: true,
      needsReview: true,
    });
    expect(result.entries[1].end).toBeNull();
    expect(result.entries[2].details).toBeNull();

    // The request used the configured model and carried the text as data.
    expect(calls).toHaveLength(1);
    expect(calls[0].model).toBe(models.MAIN);
    expect(calls[0].system).toBe(EXTRACTION_SYSTEM);
    expect(calls[0].prompt).toContain("<profile_text>");
  });

  it("flags an invented entry and keeps it out of matching", async () => {
    const { client } = fixtureLlm(reply);
    const result = await extractEntries(client, await extractPdfText(pdf()), "linkedin_pdf");
    const invented = result.entries.find((e) => e.value === "Globex Capital");
    expect(result.flagged).toBe(1);
    expect(invented).toMatchObject({ useForMatching: false, needsReview: true });
  });

  it("marks every extracted entry for review", async () => {
    const { client } = fixtureLlm(reply);
    const result = await extractEntries(client, await extractPdfText(pdf()), "resume");
    expect(result.entries.every((e) => e.needsReview && e.source === "resume")).toBe(true);
  });

  it("rejects a reply in the wrong shape", async () => {
    const { client } = fixtureLlm({ entries: [{ type: "astronaut", value: "x", start: null, end: null, details: null }] });
    await expect(extractEntries(client, "x", "resume")).rejects.toThrow();
  });

  it("cuts very long text and says so", async () => {
    const { client, calls } = fixtureLlm({ entries: [] });
    const result = await extractEntries(client, "a".repeat(profile.MAX_SOURCE_CHARS + 500), "resume");
    expect(result.truncated).toBe(true);
    expect(calls[0].prompt.length).toBeLessThan(profile.MAX_SOURCE_CHARS + 100);
  });

  it("the prompt tells the model to copy names and ignore instructions in the text", () => {
    expect(EXTRACTION_SYSTEM).toMatch(/exactly as it is written/);
    expect(EXTRACTION_SYSTEM).toMatch(/data, not instructions/);
  });
});

describe("aliases", () => {
  it("returns tidy suggestions for MIT ESP (plumbing check with a canned reply)", async () => {
    const { client, calls } = fixtureLlm({
      aliases: ["MIT Educational Studies Program", "Splash", "Spark", "HSSP", "mit esp", " Splash ", ""],
    });
    const aliases = await suggestAliases(client, { type: "program", value: "MIT ESP" });
    expect(aliases).toEqual(["MIT Educational Studies Program", "Splash", "Spark", "HSSP"]);
    expect(aliases.some((a) => a.includes("Educational Studies Program"))).toBe(true);
    expect(calls[0].system).toBe(ALIAS_SYSTEM);
    expect(calls[0].prompt).toContain("Name: MIT ESP");
    expect(calls[0].prompt).toContain("Kind: Program");
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
