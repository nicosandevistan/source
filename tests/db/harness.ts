import { PGlite } from "@electric-sql/pglite";
import { listFiles, read } from "../helpers/files";

/**
 * A real Postgres (PGlite, in-process) with the project's migrations
 * applied, plus the small part of Supabase the migrations rely on: the
 * auth schema, auth.uid(), and the anon / authenticated / service_role
 * roles with Supabase's default table grants. Row Level Security is then
 * the only thing standing between two users, as in production.
 */
const SUPABASE_SHIM = `
  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export type Role = "anon" | "authenticated" | "service_role";
export type Runner = <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;

export async function createTestDb() {
  const db = new PGlite();
  await db.exec(SUPABASE_SHIM);
  for (const file of listFiles("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(read(file));
  }

  /** Runs queries the way a request from this user would, then rolls nothing back. */
  async function as<T>(role: Role, userId: string | null, work: (run: Runner) => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ""]);
      await tx.exec(`set local role ${role}`);
      const run: Runner = async (sql, params) => (await tx.query(sql, params)).rows as never;
      return work(run);
    });
  }

  /** Simulates a first sign-in: Supabase inserts into auth.users. */
  async function signUp(id: string, email: string, fullName?: string) {
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
      id,
      email,
      JSON.stringify(fullName ? { full_name: fullName } : {}),
    ]);
  }

  const tables = async () =>
    (
      await db.query<{ tablename: string; rowsecurity: boolean }>(
        `select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename`,
      )
    ).rows;

  return { db, as, signUp, tables };
}
