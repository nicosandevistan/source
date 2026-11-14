import { plan as planConfig } from "@/config/app";
import { appearsIn, normalizeForMatch } from "@/lib/engine/profile/text";
import type { EntryType } from "@/lib/engine/profile/types";
import { FIRMS, INDUSTRY_LABELS, SEGMENTS, segmentIndustry, type Firm, type Industry } from "./catalog";
import type { ParsedGoal } from "./intake";

/**
 * Plan generation with rules, not a language model (zero-cost build).
 *
 * 1. Candidate firms: catalog firms in the goal's industries, plus any firm
 *    the user named.
 * 2. Tier for this user: from the firm's selectivity, one step easier when
 *    the user already has a way in (they worked or studied there).
 * 3. Pick 5–8 firms with a spread of reach, target and likely, rotating
 *    across industries, preferring firms the user named, firms they have a
 *    way into, healthcare-focused firms when that fits, and their locations.
 * 4. Every firm gets a one-line reason built from a specific profile entry.
 */

export type Tier = "reach" | "target" | "likely";
export const TIERS: Tier[] = ["reach", "target", "likely"];

export type PlanEntry = {
  type: EntryType;
  value: string;
  aliases?: string[];
  details?: string | null;
  start_date?: string | null;
  use_for_matching?: boolean;
};

export type PlanInput = {
  goal: ParsedGoal;
  entries: PlanEntry[];
  locations: string[];
  knownFirms: string[];
};

export type PlanTargetDraft = {
  firmSlug: string | null;
  name: string;
  industry: Industry | null;
  tier: Tier | null;
  rationale: string;
};

/** Cities counted as one area when matching a preferred location. */
const METROS: Record<string, string[]> = {
  boston: ["boston", "cambridge", "waltham", "lexington", "somerville", "watertown"],
  "new york": ["new york", "nyc", "manhattan", "brooklyn", "stamford", "rahway", "tarrytown", "new brunswick", "princeton", "florham park", "bridgewater"],
  "san francisco": ["san francisco", "sf", "bay area", "south san francisco", "palo alto", "menlo park", "mountain view", "foster city", "santa clara", "cupertino", "pleasanton", "san rafael"],
  chicago: ["chicago", "evanston", "north chicago"],
  "washington dc": ["washington dc", "dc", "washington", "mclean"],
};

const ABROAD = /\b(uk|england|germany|japan|switzerland|france|denmark|netherlands|canada|india|china)\b/;

function metroOf(place: string): string {
  const p = normalizeForMatch(place);
  if (ABROAD.test(p)) return p; // "Cambridge, UK" is not Cambridge, MA
  for (const [metro, cities] of Object.entries(METROS)) {
    if (cities.some((c) => p === c || p.startsWith(`${c} `))) return metro;
  }
  return p;
}

function inLocations(firm: Firm, locations: string[]): boolean {
  if (locations.length === 0) return false;
  if (firm.national) return true;
  const firmMetro = metroOf(firm.hq);
  return locations.some((l) => metroOf(l) === firmMetro);
}

/** Names a firm goes by; very short aliases ("GS", "AZ") only count as an exact match. */
function firmNames(firm: Firm): string[] {
  return [firm.name, ...(firm.aliases ?? [])];
}

function entryNames(entry: PlanEntry): string[] {
  return [entry.value, ...(entry.aliases ?? [])];
}

/** True when an entry names this firm (worked, interned or studied there). */
export function entryMatchesFirm(entry: PlanEntry, firm: Firm): boolean {
  for (const firmName of firmNames(firm)) {
    const f = normalizeForMatch(firmName);
    for (const name of entryNames(entry)) {
      const e = normalizeForMatch(name);
      if (e === f) return true;
      if (f.length >= 4 && appearsIn(firmName, name)) return true; // "Takeda" in "Takeda Pharmaceutical Company"
      if (e.length >= 4 && f.split(" ").length > 1 && appearsIn(name, firmName)) return true;
    }
  }
  return false;
}

/** Finds a catalog firm by any of its names, for firms the user types in. */
export function findFirm(name: string): Firm | undefined {
  const n = normalizeForMatch(name);
  if (!n) return undefined;
  return FIRMS.find((firm) => firmNames(firm).some((f) => normalizeForMatch(f) === n));
}

const INDUSTRY_SIGNALS: Record<Industry, string[]> = {
  consulting: ["consulting", "consultant", "consult", "strategy", "advisory", "case"],
  banking: ["bank", "banking", "finance", "financial", "capital markets", "m a"],
  investing: ["invest", "investing", "investment", "fund", "capital", "venture", "trading", "portfolio", "equity", "catalyst"],
  biotech_pharma: ["bio", "biotech", "biology", "pharma", "therapeutics", "genetic", "rna", "igem", "lab", "research", "life sciences", "biosciences", "bioworks"],
  tech: ["software", "data", "engineer", "engineering", "developer", "computer", "hackathon", "ai", "coding", "python", "machine learning"],
};
const HEALTHCARE_SIGNALS = [...INDUSTRY_SIGNALS.biotech_pharma, "health", "healthcare", "medical", "medicine", "clinical", "hospital", "pharmaceutical"];

/** Entry kinds that describe work or involvement (used as talking points). */
const INVOLVEMENT: EntryType[] = ["employer", "program", "club", "volunteer", "scholarship", "affinity_org", "publication"];

function textOf(entry: PlanEntry): string {
  return normalizeForMatch([entry.value, entry.details ?? ""].join(" "));
}

function mentions(entry: PlanEntry, words: string[]): boolean {
  const t = ` ${textOf(entry)} `;
  // "bio" also matches inside words like "biotechnology", "bioworks".
  return words.some((w) => (w === "bio" ? /\bbio/.test(t) : t.includes(` ${normalizeForMatch(w)} `)));
}

/** Most recent first, so a talking point is a current one. */
function byRecency(a: PlanEntry, b: PlanEntry): number {
  return (b.start_date ?? "").localeCompare(a.start_date ?? "");
}

function describe(entry: PlanEntry): string {
  const hasRole = ["employer", "club", "volunteer"].includes(entry.type) && entry.details && entry.details.length <= 60;
  return hasRole ? `${entry.details} role at ${entry.value}` : entry.value;
}

type Scored = { firm: Firm; index: number; tier: Tier; score: number; warm: PlanEntry | null; known: boolean };

export function generatePlan(input: PlanInput): PlanTargetDraft[] {
  const entries = input.entries.filter((e) => e.use_for_matching !== false);
  const involvement = entries.filter((e) => INVOLVEMENT.includes(e.type)).sort(byRecency);
  const healthcareEntries = involvement.filter((e) => mentions(e, HEALTHCARE_SIGNALS));
  const school = entries.find((e) => e.type === "school") ?? null;
  const leansHealthcare = input.goal.healthcareFocus || healthcareEntries.length >= 2;

  const knownNames = input.knownFirms.map((n) => n.trim()).filter(Boolean);
  const knownFirms = knownNames.map(findFirm);

  const scored: Scored[] = FIRMS.map((firm, index) => {
    const warm = entries.find((e) => entryMatchesFirm(e, firm)) ?? null;
    const known = knownFirms.includes(firm);
    const base = TIERS[firm.selectivity - 1];
    const tier = warm && base !== "likely" ? TIERS[firm.selectivity] : base;
    let score = 0;
    if (known) score += 100;
    if (warm) score += 50;
    if (leansHealthcare && firm.focus?.includes("healthcare")) score += 20;
    if (inLocations(firm, input.locations)) score += 15;
    if (involvement.some((e) => mentions(e, INDUSTRY_SIGNALS[segmentIndustry(firm.segment)]))) score += 5;
    return { firm, index, tier, score, warm, known };
  });

  const inScope = scored.filter((s) => s.known || input.goal.industries.includes(segmentIndustry(s.firm.segment)));
  const rank = (a: Scored, b: Scored) => b.score - a.score || a.index - b.index;

  const picked: Scored[] = inScope.filter((s) => s.known).sort(rank).slice(0, planConfig.MAX_TARGET_FIRMS);
  const take = (s: Scored) => !picked.includes(s) && picked.length < planConfig.MAX_TARGET_FIRMS && picked.push(s);

  // Fill each tier's quota, rotating across the goal's industries.
  const industries = input.goal.industries;
  for (const tier of ["target", "reach", "likely"] as Tier[]) {
    const quota = planConfig.TIER_QUOTAS[tier] - picked.filter((s) => s.tier === tier).length;
    const pools = industries.map((industry) =>
      inScope.filter((s) => s.tier === tier && segmentIndustry(s.firm.segment) === industry && !picked.includes(s)).sort(rank),
    );
    // Industries with a stronger best candidate go first in the rotation.
    const order = pools.map((_, i) => i).sort((a, b) => (pools[b][0]?.score ?? -1) - (pools[a][0]?.score ?? -1) || a - b);
    let added = 0;
    for (let round = 0; added < quota && pools.some((p) => p.length); round += 1) {
      for (const i of order) {
        if (added >= quota) break;
        const next = pools[i].shift();
        if (next && take(next)) added += 1;
      }
    }
  }
  // Too few (a narrow goal)? Top up from anything in scope.
  for (const s of [...inScope].sort(rank)) {
    if (picked.length >= planConfig.MIN_TARGET_FIRMS) break;
    take(s);
  }

  const drafts: PlanTargetDraft[] = picked.sort(rank).map((s, position) => ({
    firmSlug: s.firm.slug,
    name: s.firm.name,
    industry: segmentIndustry(s.firm.segment),
    tier: s.tier,
    rationale: rationaleFor(s, { involvement, healthcareEntries, school, leansHealthcare, locations: input.locations }, position),
  }));

  // Firms the user named that are not in the catalog stay as their own picks.
  knownNames.forEach((name, i) => {
    if (knownFirms[i] || drafts.length >= planConfig.MAX_TARGET_FIRMS) return;
    drafts.unshift({ firmSlug: null, name, industry: null, tier: null, rationale: customRationale(involvement, school) });
  });
  return drafts.slice(0, planConfig.MAX_TARGET_FIRMS);
}

type Context = {
  involvement: PlanEntry[];
  healthcareEntries: PlanEntry[];
  school: PlanEntry | null;
  leansHealthcare: boolean;
  locations: string[];
};

const article = (word: string) => (/^[aeiou]/i.test(word) ? "An" : "A");

function rationaleFor(s: Scored, ctx: Context, position: number): string {
  const industry = segmentIndustry(s.firm.segment);
  const industryName = INDUSTRY_LABELS[industry].toLowerCase();
  const segmentName = SEGMENTS[s.firm.segment].label.toLowerCase();
  const sentences: string[] = [];
  // Rotate talking points and wording so a plan does not repeat one line.
  const pick = <T,>(items: T[]) => items[position % items.length];

  if (s.warm) {
    sentences.push(`You already have a way in through your ${describe(s.warm)}; people you worked with are your warmest first contacts.`);
  } else if (s.known) {
    sentences.push("You named it as a firm you want.");
  }

  if (!s.warm) {
    const fit = ctx.involvement.filter((e) => mentions(e, INDUSTRY_SIGNALS[industry]));
    if (s.firm.focus?.includes("healthcare") && ctx.healthcareEntries.length) {
      const x = describe(pick(ctx.healthcareEntries));
      sentences.push(
        pick([
          `Its healthcare focus fits your ${x}.`,
          `Your ${x} gives you something specific to talk about with its healthcare team.`,
          `A healthcare specialist; open with your ${x}.`,
        ]),
      );
    } else if (fit.length) {
      const x = describe(pick(fit));
      sentences.push(
        pick([`Your ${x} is a natural talking point for ${industryName}.`, `Open with your ${x}; it shows real interest in ${industryName}.`]),
      );
    } else if (ctx.school) {
      sentences.push(`${article(segmentName)} ${segmentName} option; start with ${ctx.school.value} alumni there.`);
    } else {
      sentences.push(`${article(segmentName)} ${segmentName} option. Add more to your profile so shared backgrounds can be found.`);
    }
  }

  if (!s.firm.national && inLocations(s.firm, ctx.locations)) sentences.push(`Based in ${s.firm.hq}, where you want to work.`);
  return sentences.join(" ");
}

function customRationale(involvement: PlanEntry[], school: PlanEntry | null): string {
  const lead = "You named it as a firm you want. It is not in the catalog, so check its application dates yourself.";
  if (involvement[0]) return `${lead} Your ${describe(involvement[0])} is a good talking point.`;
  if (school) return `${lead} Start with ${school.value} alumni there.`;
  return lead;
}
