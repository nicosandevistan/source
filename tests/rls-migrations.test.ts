import { describe, expect, it } from "vitest";
import { listFiles, read } from "./helpers/files";

/**
 * Static guard for "RLS on every table" (spec sections 6 and 11).
 * Tests that run real queries as two different users start in milestone 1,
 * with the first tables that hold user content (see DECISIONS.md).
 */
const migrations = listFiles("supabase/migrations").filter((f) => f.endsWith(".sql"));
const sql = migrations.map(read).join("\n").toLowerCase();

const tables = [...sql.matchAll(/create table (?:if not exists )?(?:public\.)?([a-z_]+)/g)].map(
  (m) => m[1],
);

describe("migrations", () => {
  it("has at least one migration and one table", () => {
    expect(migrations.length).toBeGreaterThan(0);
    expect(tables.length).toBeGreaterThan(0);
  });

  it.each(tables)("%s enables Row Level Security", (table) => {
    expect(sql).toMatch(
      new RegExp(`alter table (?:public\\.)?${table} enable row level security`),
    );
  });

  it.each(tables)("%s has at least one policy", (table) => {
    expect(sql).toMatch(new RegExp(`create policy [^;]+ on (?:public\\.)?${table}\\b`));
  });

  it.each(tables)("%s has created_at and updated_at", (table) => {
    const body = sql.slice(sql.indexOf(`create table public.${table}`));
    const definition = body.slice(0, body.indexOf(");"));
    expect(definition).toContain("created_at");
    expect(definition).toContain("updated_at");
  });

  it("never opens a table to everyone", () => {
    expect(sql).not.toMatch(/using \(\s*true\s*\)/);
    expect(sql).not.toMatch(/disable row level security/);
  });
});
