import Papa from "papaparse";

export type ColumnAliases = Record<string, readonly string[]>;

function key(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Reads a CSV into rows keyed by our own column names.
 *
 * LinkedIn's export is loose: some files start with a "Notes:" preamble
 * before the real header, and column names have changed over the years
 * ("Started On" / "Start Date"). So the header row is found by looking for
 * the first row that contains a known name for a required column, and each
 * column is matched through a list of accepted names.
 */
export function readCsv<C extends ColumnAliases>(
  text: string,
  columns: C,
  required: keyof C & string,
): Record<keyof C, string>[] {
  const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ""), {
    skipEmptyLines: "greedy",
  });
  const rows = parsed.data.filter((row) => Array.isArray(row));

  const requiredNames = new Set(columns[required].map(key));
  const headerIndex = rows.findIndex((row) => row.some((cell) => requiredNames.has(key(cell))));
  if (headerIndex === -1) return [];

  const header = rows[headerIndex].map(key);
  const position = {} as Record<keyof C, number>;
  for (const name of Object.keys(columns) as (keyof C & string)[]) {
    position[name] = header.findIndex((h) => columns[name].map(key).includes(h));
  }

  return rows.slice(headerIndex + 1).map((row) => {
    const out = {} as Record<keyof C, string>;
    for (const name of Object.keys(columns) as (keyof C & string)[]) {
      const i = position[name];
      out[name] = i === -1 ? "" : (row[i] ?? "").trim();
    }
    return out;
  });
}
