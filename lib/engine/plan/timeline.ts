import { plan as planConfig } from "@/config/app";
import { FIRMS, WINDOWS, type Firm } from "./catalog";

export type Timeline = {
  /** When to start reaching out: a few weeks before applications open. */
  outreachFrom: Date;
  opens: Date;
  closes: Date;
  status: "upcoming" | "start_now" | "probably_closed";
};

/**
 * Estimated outreach and application dates for a firm's summer internship
 * in `summerYear`, worked back from its segment's usual window (spec 7.2).
 * Always shown with the word "estimate".
 */
export function timelineFor(firm: Firm, summerYear: number, today: Date): Timeline {
  const w = WINDOWS[firm.segment];
  const openYear = summerYear + w.yearOffset;
  const opens = new Date(Date.UTC(openYear, w.opens - 1, 1));
  const closeYear = w.closes < w.opens ? openYear + 1 : openYear;
  // Last day of the closing month.
  const closes = new Date(Date.UTC(closeYear, w.closes, 0));
  const outreachFrom = new Date(opens.getTime() - planConfig.OUTREACH_LEAD_WEEKS * 7 * 24 * 60 * 60 * 1000);
  const status = today > closes ? "probably_closed" : today >= outreachFrom ? "start_now" : "upcoming";
  return { outreachFrom, opens, closes, status };
}

export function firmBySlug(slug: string | null): Firm | undefined {
  return slug ? FIRMS.find((f) => f.slug === slug) : undefined;
}

export function monthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** The contact ladder for every firm (spec 7.8), in plain words. */
export const LADDER = [
  "A junior person you share a background with",
  "Someone with a different shared background",
  "The campus recruiter, through the firm's official channels",
] as const;

export function firstAsk(): string {
  return `A ${planConfig.FIRST_ASK_MINUTES_MIN}–${planConfig.FIRST_ASK_MINUTES_MAX} minute chat about their path. Not a referral.`;
}
