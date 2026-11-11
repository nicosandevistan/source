const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/**
 * Turns the date formats LinkedIn uses ("Jun 2025", "June 2025", "2025",
 * "2025-06", "06/2025") into "YYYY-MM" or "YYYY". Returns null for
 * "Present", blanks and anything unrecognized.
 */
export function normalizeDate(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;

  let m = /^(\d{4})$/.exec(text);
  if (m) return m[1];

  m = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(text);
  if (m) return month(m[1], m[2]);

  m = /^(\d{1,2})\/(\d{4})$/.exec(text);
  if (m) return month(m[2], m[1]);

  m = /^([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(text);
  if (m) {
    const mm = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mm) return `${m[2]}-${mm}`;
  }

  // "12 Jun 2025" or "Jun 12, 2025"
  m = /^(?:\d{1,2}\s+)?([A-Za-z]{3,9})\.?\s+(?:\d{1,2},?\s+)?(\d{4})$/.exec(text);
  if (m) {
    const mm = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mm) return `${m[2]}-${mm}`;
  }

  return null;
}

function month(year: string, m: string): string | null {
  const n = Number(m);
  if (n < 1 || n > 12) return null;
  return `${year}-${String(n).padStart(2, "0")}`;
}

const MONTH_NAME =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const SEASON = "(?:spring|summer|fall|autumn|winter)";
const ONE_DATE = `(?:(?:${MONTH_NAME}|${SEASON})\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4})`;
const END_DATE = `(?:${ONE_DATE}|present|current|now|ongoing)`;
const RANGE = new RegExp(
  `(?:(?:expected|anticipated)\\s+)?(${ONE_DATE})(?:\\s*(?:-|\\u2013|\\u2014|to)\\s*(${END_DATE}))?`,
  "i",
);
const SEASON_MONTH: Record<string, string> = { spring: "Mar", summer: "Jun", fall: "Sep", autumn: "Sep", winter: "Dec" };

export type DateRange = { start: string | null; end: string | null };

function toDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const season = /^(spring|summer|fall|autumn|winter)\s+(\d{4})$/i.exec(raw.trim());
  if (season) return normalizeDate(`${SEASON_MONTH[season[1].toLowerCase()]} ${season[2]}`);
  return normalizeDate(raw.replace(/\./g, ""));
}

/**
 * Finds a date or date range in a line ("June 2026 - August 2026 (3 months)",
 * "Sep 2025 – Present", "Expected May 2028", "2020 - 2024") and returns it
 * with the rest of the line. A lone date (like "Expected May 2028") is read
 * as an end date, the way resumes use it.
 */
export function findDateRange(line: string): { range: DateRange; rest: string } | null {
  const m = RANGE.exec(line);
  if (!m) return null;
  const range: DateRange = m[2] ? { start: toDate(m[1]), end: toDate(m[2]) } : { start: null, end: toDate(m[1]) };
  if (!m[2] && /^(expected|anticipated)/i.test(m[0])) range.start = null;
  const rest = (line.slice(0, m.index) + line.slice(m.index + m[0].length))
    .replace(/\(\s*\d+\s+(?:years?|yrs?|months?|mos?)(?:\s+\d+\s+(?:months?|mos?))?\s*\)/gi, "")
    .replace(/[\s|,··-]+$/u, "")
    .replace(/^[\s|,··-]+/u, "")
    .trim();
  return { range, rest };
}

/** True when a whole line is a date range, optionally with a duration in brackets. */
export function isDateLine(line: string): boolean {
  const found = findDateRange(line);
  return found !== null && found.rest === "";
}

/** LinkedIn's total-tenure line under a company with several roles, e.g. "1 year 3 months". */
export function isDurationLine(line: string): boolean {
  return /^(?:\d+\s+(?:years?|yrs?)(?:\s+\d+\s+(?:months?|mos?))?|\d+\s+(?:months?|mos?))$/i.test(line.trim());
}
