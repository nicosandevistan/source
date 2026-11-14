import { normalizeForMatch } from "@/lib/engine/profile/text";
import { INDUSTRIES, type Industry } from "./catalog";

/**
 * Reads a goal written in plain words ("consulting or finance, idk") into
 * industries, with keyword rules instead of a language model. When nothing
 * matches, every industry is in play: an unsure student should see a spread.
 */
const KEYWORDS: Record<Industry, string[]> = {
  consulting: ["consulting", "consultant", "consult", "strategy", "mbb", "mckinsey", "bcg", "bain", "advisory", "management consulting"],
  banking: ["banking", "investment banking", "ib", "banker", "m&a", "m a", "mergers", "wall street", "finance", "capital markets"],
  investing: [
    "investing", "investment", "investor", "pe", "private equity", "vc", "venture", "venture capital", "hedge fund",
    "hedge funds", "buy side", "buyside", "asset management", "quant", "trading", "trader", "finance",
  ],
  biotech_pharma: [
    "biotech", "pharma", "pharmaceutical", "life sciences", "life science", "biopharma", "drug", "drugs",
    "corporate development", "corp dev", "business development", "bd",
  ],
  tech: ["tech", "technology", "software", "product", "product management", "pm", "engineering", "data science", "startup", "startups"],
};

/** Words that point at healthcare and life sciences across industries (healthcare banking, biotech VC…). */
const HEALTHCARE_WORDS = ["healthcare", "health care", "health", "life sciences", "life science", "biotech", "pharma", "medical", "bio"];

export type ParsedGoal = {
  industries: Industry[];
  /** True when the goal leans toward healthcare or life sciences. */
  healthcareFocus: boolean;
  /** True when no industry was recognized, so all are used. */
  undecided: boolean;
};

function has(text: string, phrase: string): boolean {
  return ` ${text} `.includes(` ${normalizeForMatch(phrase)} `);
}

export function parseGoal(raw: string, chosen: Industry[] = []): ParsedGoal {
  const text = normalizeForMatch(raw);
  const found = INDUSTRIES.filter((industry) => KEYWORDS[industry].some((k) => has(text, k)));
  const industries = [...new Set([...chosen, ...found])];
  return {
    industries: industries.length ? INDUSTRIES.filter((i) => industries.includes(i)) : [...INDUSTRIES],
    healthcareFocus: HEALTHCARE_WORDS.some((w) => has(text, w)),
    undecided: industries.length === 0,
  };
}
