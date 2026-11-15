import { discovery, entryTypeToHookType, type HookType } from "@/config/app";
import type { Firm } from "@/lib/engine/plan/catalog";
import { entryMatchesFirm } from "@/lib/engine/plan/generate";
import { findHooks, type Evidence, type FoundHook, type HookEntry } from "@/lib/engine/hooks/find";
import { hookStrength, personScore, type ScoreBreakdown } from "@/lib/engine/hooks/score";
import { verifyHook } from "@/lib/engine/hooks/verify";
import { normalizeForMatch } from "@/lib/engine/profile/text";
import { classifyTitle } from "./titles";

export type Person = {
  id: string;
  source: "connections" | "manual";
  full_name: string;
  company: string;
  title: string;
  linkedin_url: string | null;
};

export type StoredEvidence = Evidence & { personId: string; kind: "web" | "pasted" };

/** A hook ready to show: verified, with its strength. */
export type ShownHook = FoundHook & { strength: number; source: "page" | "record"; url: string | null };

export type Candidate = {
  person: Person;
  junior: boolean;
  recruiter: boolean;
  hooks: ShownHook[];
  /** Verified but identity not confirmed: hidden unless the user asks. */
  unconfirmed: ShownHook[];
  score: ScoreBreakdown;
  rung: "warm_junior" | "second_hook" | "recruiter" | null;
};

/** True when a person's current company is this firm (or the user's own pick by name). */
export function worksAt(person: Person, firm: Firm | null, customName: string | null): boolean {
  if (!person.company) return false;
  if (firm) return entryMatchesFirm({ type: "employer", value: person.company }, firm);
  return !!customName && normalizeForMatch(customName) === normalizeForMatch(person.company);
}

const MENTOR = /\b(mentor|mentors|mentoring|mentorship|happy to chat|office hours|coffee chat|advis(e|es|ing) students)\b/i;

/**
 * Builds the ranked candidate list for one plan firm (spec 7.3–7.8):
 * people from the user's connections or added by hand who work there,
 * their verified hooks, score and ladder role.
 */
export function candidatesFor(
  firm: Firm | null,
  customName: string | null,
  people: Person[],
  evidence: StoredEvidence[],
  entries: HookEntry[],
): Candidate[] {
  const companyNames = firm ? [firm.name, ...(firm.aliases ?? [])] : customName ? [customName] : [];
  const atFirm = people.filter((p) => worksAt(p, firm, customName));
  const usedEntries = entries.filter((e) => e.use_for_matching);
  const schools = usedEntries.filter((e) => e.type === "school");

  const scored: Candidate[] = atFirm.map((person) => {
    const { junior, recruiter } = classifyTitle(person.title);
    const pages = evidence.filter((e) => e.personId === person.id);
    const shown: ShownHook[] = [];

    // Hooks from pages about them, each through the verifier.
    for (const page of pages) {
      for (const hook of findHooks({ fullName: person.full_name, company: person.company }, page, usedEntries, companyNames)) {
        const verdict = verifyHook(hook, page.text, { fullName: person.full_name, company: person.company }, companyNames);
        if (!verdict.verified) continue;
        const entry = usedEntries.find((e) => e.id === hook.entryId)!;
        shown.push({
          ...hook,
          identityConfirmed: verdict.identityConfirmed,
          strength: hookStrength(hook.hookType, entry.est_group_size, hook.timeOverlap),
          source: "page",
          url: page.url,
        });
      }
    }

    // A structured overlap from their own record: they work where the user
    // worked. The "quote" is the record itself, so it is exact by construction.
    for (const entry of usedEntries) {
      if (entry.type !== "employer" && entry.type !== "program") continue;
      if (!firm || !entryMatchesFirm({ type: entry.type, value: entry.value, aliases: entry.aliases }, firm)) continue;
      if (shown.some((h) => h.entryId === entry.id)) continue;
      const hookType: HookType = entryTypeToHookType[entry.type];
      shown.push({
        entryId: entry.id,
        entryValue: entry.value,
        matched: entry.value,
        hookType,
        quote: [person.title, person.company].filter(Boolean).join(" at "),
        evidenceId: "",
        identityConfirmed: true,
        timeOverlap: false,
        strength: hookStrength(hookType, entry.est_group_size, false),
        source: "record",
        url: person.linkedin_url,
      });
    }

    const confirmed = shown.filter((h) => h.identityConfirmed).sort((a, b) => b.strength - a.strength);
    const unconfirmed = shown.filter((h) => !h.identityConfirmed);
    const alum = confirmed.some((h) => schools.some((s) => s.id === h.entryId));
    const mentor = pages.some((p) => MENTOR.test(p.text));
    const score = personScore({ strengths: confirmed.map((h) => h.strength), junior, alum, mentor, busy: false });
    return { person, junior, recruiter, hooks: confirmed, unconfirmed, score, rung: null };
  });

  scored.sort((a, b) => b.score.total - a.score.total || a.person.full_name.localeCompare(b.person.full_name));
  const list = scored.slice(0, discovery.CANDIDATES_PER_FIRM);
  assignLadder(list);
  return list;
}

/**
 * The contact ladder (spec 7.8):
 *   1. warm junior: the best-scored junior with at least one verified hook;
 *   2. second hook: the next best with a hook of a different type than rung 1;
 *   3. recruiter: a campus recruiter (no hook needed).
 */
export function assignLadder(list: Candidate[]): void {
  const first = list.find((c) => c.junior && c.hooks.length > 0);
  if (first) first.rung = "warm_junior";
  const firstTypes = new Set(first?.hooks.map((h) => h.hookType) ?? []);
  const second = list.find((c) => c !== first && !c.recruiter && c.hooks.some((h) => !firstTypes.has(h.hookType)));
  if (second) second.rung = "second_hook";
  const recruiter = list.find((c) => c.recruiter && !c.rung);
  if (recruiter) recruiter.rung = "recruiter";
}

/**
 * Web searches the user can run themselves (spec 7.5 step 1, at most 6 per
 * person): the person with their company, then with the user's rarest
 * entries. The app never runs them; it only builds the links.
 */
export function searchQueries(person: Person, entries: HookEntry[]): string[] {
  const rare = entries
    .filter((e) => e.use_for_matching && e.type !== "language" && e.type !== "interest")
    .sort((a, b) => a.est_group_size - b.est_group_size)
    .slice(0, discovery.MAX_QUERIES_PER_PERSON - 1);
  const queries = [`"${person.full_name}" "${person.company}"`];
  for (const e of rare) queries.push(`"${person.full_name}" "${e.aliases[0] ?? e.value}"`);
  return queries.slice(0, discovery.MAX_QUERIES_PER_PERSON);
}
