import { strFromU8, unzipSync } from "fflate";
import { readCsv } from "@/lib/engine/profile/csv";
import { normalizeDate } from "@/lib/engine/profile/dates";
import { clean } from "@/lib/engine/profile/text";

/** A person before saving. Only what the user's own export already holds. */
export type PersonDraft = {
  fullName: string;
  company: string;
  title: string;
  linkedinUrl: string | null;
  /** "YYYY-MM" or "YYYY" when known. */
  connectedOn: string | null;
};

const CONNECTIONS_FILE = /(^|\/)connections\.csv$/i;

/**
 * Opens a LinkedIn data export ZIP in the browser and returns only
 * Connections.csv. Messages and everything else are never decompressed.
 */
export function pickConnectionsFile(zip: Uint8Array): string | null {
  const unzipped = unzipSync(zip, { filter: (file) => CONNECTIONS_FILE.test(file.name) });
  const first = Object.values(unzipped)[0];
  return first ? strFromU8(first) : null;
}

/** "02 Nov 2025", "11/02/2025", "2025-11-02" → "2025-11". */
function connectedDate(raw: string): string | null {
  const text = raw.trim();
  const us = /^(\d{1,2})\/\d{1,2}\/(\d{4})$/.exec(text);
  if (us) return normalizeDate(`${us[1]}/${us[2]}`);
  return normalizeDate(text);
}

/**
 * Reads LinkedIn's Connections.csv. Email addresses in the file are
 * deliberately not kept (DECISIONS.md, milestone 3).
 */
export function parseConnections(text: string): PersonDraft[] {
  const rows = readCsv(
    text,
    {
      first: ["First Name", "FirstName"],
      last: ["Last Name", "LastName"],
      url: ["URL", "Profile URL", "LinkedIn URL"],
      company: ["Company", "Company Name", "Organization"],
      title: ["Position", "Title", "Job Title"],
      connected: ["Connected On", "Connected", "Date Connected"],
    },
    "first",
  );
  const out: PersonDraft[] = [];
  for (const r of rows) {
    const fullName = clean(`${r.first} ${r.last}`);
    if (!fullName) continue;
    const url = clean(r.url);
    out.push({
      fullName: fullName.slice(0, 200),
      company: clean(r.company).slice(0, 200),
      title: clean(r.title).slice(0, 300),
      linkedinUrl: /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(url) ? url.slice(0, 500) : null,
      connectedOn: connectedDate(r.connected),
    });
  }
  return out;
}
