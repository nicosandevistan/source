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
