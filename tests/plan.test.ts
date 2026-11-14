import { describe, expect, it } from "vitest";
import { plan as planConfig } from "@/config/app";
import { FIRMS, INDUSTRIES, SEGMENTS, WINDOWS, segmentIndustry } from "@/lib/engine/plan/catalog";
import { entryMatchesFirm, findFirm, generatePlan, type PlanEntry } from "@/lib/engine/plan/generate";
import { parseGoal } from "@/lib/engine/plan/intake";
import { firmBySlug, timelineFor } from "@/lib/engine/plan/timeline";

// A made-up student profile.
const PROFILE: PlanEntry[] = [
  { type: "school", value: "Example State University", details: "BS Economics" },
  { type: "employer", value: "Example Consulting Group", details: "Junior Analyst", start_date: "2025-09" },
  { type: "employer", value: "Takeda Pharmaceutical Company", details: "Strategy Intern", start_date: "2026-05" },
  { type: "club", value: "iGEM Example Team", details: "Vice President", start_date: "2023-12" },
  { type: "high_school", value: "Revere High School" },
  { type: "language", value: "Spanish" },
];

const plan = (goal: string, extra: Partial<Parameters<typeof generatePlan>[0]> = {}) =>
  generatePlan({ goal: parseGoal(goal), entries: PROFILE, locations: [], knownFirms: [], ...extra });

describe("firm catalog", () => {
  it("has about 150 firms or more, each with a unique slug and a known segment", () => {
    expect(FIRMS.length).toBeGreaterThanOrEqual(150);
    expect(new Set(FIRMS.map((f) => f.slug)).size).toBe(FIRMS.length);
    for (const f of FIRMS) {
      expect(SEGMENTS[f.segment], f.slug).toBeDefined();
      expect([1, 2, 3]).toContain(f.selectivity);
      expect(f.name.toLowerCase()).not.toContain("placeholder");
    }
  });

  it("covers every industry and every tier", () => {
    for (const industry of INDUSTRIES) {
      const firms = FIRMS.filter((f) => segmentIndustry(f.segment) === industry);
      expect(firms.length, industry).toBeGreaterThanOrEqual(15);
    }
    for (const sel of [1, 2, 3]) expect(FIRMS.some((f) => f.selectivity === sel)).toBe(true);
  });

  it("every segment has an application window", () => {
    for (const segment of Object.keys(SEGMENTS)) expect(WINDOWS[segment as keyof typeof WINDOWS]).toBeDefined();
  });

  it("finds firms by any of their names", () => {
    expect(findFirm("bcg")?.slug).toBe("bcg");
    expect(findFirm("The Boston Consulting Group")?.slug).toBe("bcg");
    expect(findFirm("JPMorgan Chase")?.slug).toBe("jpmorgan");
    expect(findFirm("Some Firm Nobody Knows")).toBeUndefined();
  });
});

describe("goal intake", () => {
  it("reads 'consulting or finance, idk' as consulting, banking and investing", () => {
    expect(parseGoal("consulting or finance, idk")).toMatchObject({
      industries: ["consulting", "banking", "investing"],
      undecided: false,
    });
  });

  it("uses every industry when nothing is recognized", () => {
    expect(parseGoal("idk honestly")).toMatchObject({ industries: [...INDUSTRIES], undecided: true });
  });

  it("notices a healthcare lean and adds industries the user ticked", () => {
    expect(parseGoal("healthcare investing", ["biotech_pharma"])).toMatchObject({
      industries: ["investing", "biotech_pharma"],
      healthcareFocus: true,
    });
    expect(parseGoal("PE or VC").industries).toEqual(["investing"]);
    expect(parseGoal("software or product").industries).toEqual(["tech"]);
  });
});

describe("plan generation (acceptance: 'consulting or finance, idk')", () => {
  const result = plan("consulting or finance, idk");

  it("returns 5–8 firms, all from the catalog", () => {
    expect(result.length).toBeGreaterThanOrEqual(planConfig.MIN_TARGET_FIRMS);
    expect(result.length).toBeLessThanOrEqual(planConfig.MAX_TARGET_FIRMS);
    for (const t of result) expect(firmBySlug(t.firmSlug), t.name).toBeDefined();
  });

  it("stays within the goal's industries and spreads across them", () => {
    const industries = new Set(result.map((t) => t.industry));
    for (const i of industries) expect(["consulting", "banking", "investing"]).toContain(i);
    expect(industries.size).toBeGreaterThanOrEqual(2);
  });

  it("mixes reach, target and likely", () => {
    const tiers = new Set(result.map((t) => t.tier));
    expect(tiers).toEqual(new Set(["reach", "target", "likely"]));
  });

  it("ties every reason to a specific profile entry", () => {
    const names = PROFILE.map((e) => e.value);
    for (const t of result) {
      expect(names.some((n) => t.rationale.includes(n)), `${t.name}: ${t.rationale}`).toBe(true);
    }
  });

  it("is the same every time for the same input", () => {
    expect(plan("consulting or finance, idk")).toEqual(result);
  });
});

describe("plan generation rules", () => {
  it("puts a firm the user worked at first, one tier easier, with that as the reason", () => {
    const result = plan("biotech or pharma");
    const takeda = result.find((t) => t.firmSlug === "takeda");
    expect(takeda).toBeDefined();
    expect(result[0].firmSlug).toBe("takeda");
    expect(takeda!.tier).toBe("likely"); // selective (target) firm, made easier by the way in
    expect(takeda!.rationale).toContain("Strategy Intern role at Takeda Pharmaceutical Company");
  });

  it("always includes firms the user named, and keeps unknown ones as their own picks", () => {
    const result = plan("tech", { knownFirms: ["Bain", "Tiny Startup Inc"] });
    expect(result.map((t) => t.name)).toEqual(expect.arrayContaining(["Bain & Company", "Tiny Startup Inc"]));
    const custom = result.find((t) => t.name === "Tiny Startup Inc")!;
    expect(custom).toMatchObject({ firmSlug: null, tier: null });
    expect(custom.rationale).toMatch(/not in the catalog/);
    expect(result.find((t) => t.firmSlug === "bain")!.rationale).toContain("You named it");
    expect(result.length).toBeLessThanOrEqual(planConfig.MAX_TARGET_FIRMS);
  });

  it("prefers healthcare-focused firms for a healthcare lean, and names the matching experience", () => {
    const result = plan("healthcare consulting");
    const focused = result.filter((t) => firmBySlug(t.firmSlug)?.focus?.includes("healthcare"));
    expect(focused.length).toBeGreaterThanOrEqual(result.length / 2);
    expect(focused.some((t) => t.rationale.includes("healthcare focus"))).toBe(true);
  });

  it("notes a preferred location for a firm based there", () => {
    const result = plan("life sciences consulting", { locations: ["Boston"] });
    expect(result.some((t) => t.rationale.includes("Based in Boston"))).toBe(true);
  });

  it("works with an empty profile", () => {
    const result = generatePlan({ goal: parseGoal("banking"), entries: [], locations: [], knownFirms: [] });
    expect(result.length).toBeGreaterThanOrEqual(planConfig.MIN_TARGET_FIRMS);
    expect(result.every((t) => t.rationale.length > 0)).toBe(true);
  });

  it("ignores entries switched off for matching", () => {
    const entries = PROFILE.map((e) => (e.value.startsWith("Takeda") ? { ...e, use_for_matching: false } : e));
    const result = generatePlan({ goal: parseGoal("pharma"), entries, locations: [], knownFirms: [] });
    expect(result.find((t) => t.firmSlug === "takeda")?.rationale ?? "").not.toContain("way in");
  });

  it("words long titles naturally", () => {
    const entries: PlanEntry[] = [
      { type: "employer", value: "Boston University", details: "High School Research Assistant at Wilson Wong Lab", start_date: "2023-07" },
    ];
    const result = generatePlan({ goal: parseGoal("biotech"), entries, locations: [], knownFirms: [] });
    const text = result.map((t) => t.rationale).join(" ");
    expect(text).toContain("work at Boston University");
    expect(text).not.toContain("Wilson Wong Lab role at");
  });

  it("matches firm names carefully", () => {
    const firm = (slug: string) => FIRMS.find((f) => f.slug === slug)!;
    expect(entryMatchesFirm({ type: "employer", value: "Takeda" }, firm("takeda"))).toBe(true);
    expect(entryMatchesFirm({ type: "program", value: "BioBuilder @ Ginkgo Bioworks" }, firm("ginkgo"))).toBe(true);
    // A two-letter alias must not match inside other names.
    expect(entryMatchesFirm({ type: "employer", value: "GS Lab Partners" }, firm("goldman"))).toBe(false);
    expect(entryMatchesFirm({ type: "school", value: "Boston University" }, firm("bcg"))).toBe(false);
  });
});

describe("timeline (estimates)", () => {
  const bcg = firmBySlug("bcg")!;

  it("works back outreach dates from the usual application window", () => {
    const t = timelineFor(bcg, 2028, new Date("2026-11-14T00:00:00Z"));
    expect(t.opens.toISOString().slice(0, 10)).toBe("2027-07-01");
    expect(t.closes.toISOString().slice(0, 10)).toBe("2027-09-30");
    expect(t.outreachFrom < t.opens).toBe(true);
    expect(t.status).toBe("upcoming");
  });

  it("says when to start now, and when a window has probably closed", () => {
    expect(timelineFor(bcg, 2028, new Date("2027-06-15T00:00:00Z")).status).toBe("start_now");
    expect(timelineFor(bcg, 2027, new Date("2026-11-14T00:00:00Z")).status).toBe("probably_closed");
  });

  it("handles windows that cross the new year", () => {
    const pfizer = firmBySlug("pfizer")!;
    const t = timelineFor(pfizer, 2028, new Date("2026-11-14T00:00:00Z"));
    expect(t.opens.toISOString().slice(0, 7)).toBe("2027-09");
    expect(t.closes.toISOString().slice(0, 7)).toBe("2028-01");
  });
});
