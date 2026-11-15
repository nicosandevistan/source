import { hookTypes, scoring, type HookType } from "@/config/app";

/** Rarity r(N) = min(1, max(0.2, 1 - log10(N) / 5)) (spec 7.7). */
export function rarity(groupSize: number): number {
  const n = Math.max(1, groupSize);
  return Math.min(scoring.RARITY_MAX, Math.max(scoring.RARITY_FLOOR, 1 - Math.log10(n) / scoring.RARITY_LOG_DIVISOR));
}

/** Strength of one hook: s = w(type) × r(N) × o. */
export function hookStrength(hookType: HookType, groupSize: number, timeOverlap: boolean): number {
  const o = timeOverlap ? scoring.TIME_OVERLAP_FACTOR : scoring.NO_TIME_OVERLAP_FACTOR;
  return hookTypes[hookType].weight * rarity(groupSize) * o;
}

export type ScoreInput = {
  strengths: number[];
  junior: boolean;
  /** Went to the user's school. */
  alum: boolean;
  /** A verified source shows they mentor students or offer to chat. */
  mentor: boolean;
  /** Contacted by several app users recently (zero until outreach exists). */
  busy: boolean;
};

export type ScoreBreakdown = {
  hooks: number;
  junior: number;
  alum: number;
  mentor: number;
  busy: number;
  total: number;
};

/** S = (1 − Π(1 − s_i)) + a_junior + a_alum + a_mentor − a_busy, clamped to 0–1. */
export function personScore(input: ScoreInput): ScoreBreakdown {
  const hooks = 1 - input.strengths.reduce((p, s) => p * (1 - Math.min(1, s)), 1);
  const junior = input.junior ? scoring.ADJUST_JUNIOR : 0;
  const alum = input.alum ? scoring.ADJUST_ALUM : 0;
  const mentor = input.mentor ? scoring.ADJUST_MENTOR : 0;
  const busy = input.busy ? scoring.ADJUST_BUSY : 0;
  const total = Math.min(1, Math.max(0, hooks + junior + alum + mentor - busy));
  return { hooks, junior, alum, mentor, busy, total };
}
