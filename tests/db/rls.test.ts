import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "./harness";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

let t: Awaited<ReturnType<typeof createTestDb>>;
let entryA: string;
let sampleA: string;

beforeAll(async () => {
  t = await createTestDb();
  await t.signUp(A, "a@example.com", "User A");
  await t.signUp(B, "b@example.com");

  entryA = await t.as("authenticated", A, async (run) => {
    const rows = await run<{ id: string }>(
      `insert into profile_entries (type, value, est_group_size, source)
       values ('program', 'MIT ESP', 200, 'manual') returning id`,
    );
    return rows[0].id;
  });
  sampleA = await t.as("authenticated", A, async (run) => {
    const rows = await run<{ id: string }>(
      `insert into voice_samples (text) values ('Hi Sam, thank you for your time.') returning id`,
    );
    return rows[0].id;
  });
  await t.db.query(`insert into audit_log (actor, action) values ($1, 'test.event')`, [A]);
});

describe("database: migrations apply to a real Postgres", () => {
  it("every public table has Row Level Security on", async () => {
    const tables = await t.tables();
    expect(tables.map((x) => x.tablename)).toEqual(
      expect.arrayContaining(["users", "audit_log", "profile_entries", "voice_samples", "goals", "plans", "plan_targets"]),
    );
    expect(tables.filter((x) => !x.rowsecurity)).toEqual([]);
  });

  it("signing up creates the users row with name and email", async () => {
    const rows = await t.as("authenticated", A, (run) => run(`select id, email, name from users`));
    expect(rows).toEqual([{ id: A, email: "a@example.com", name: "User A" }]);
  });
});

describe("RLS: user A cannot touch user B's rows, and the reverse", () => {
  it("each user sees only their own users row", async () => {
    const rows = await t.as("authenticated", B, (run) => run<{ id: string }>(`select id from users`));
    expect(rows.map((r) => r.id)).toEqual([B]);
  });

  it("a user cannot change another user's settings", async () => {
    const changed = await t.as("authenticated", B, (run) =>
      run(`update users set name = 'hacked' where id = $1 returning id`, [A]),
    );
    expect(changed).toEqual([]);
  });

  it("a user cannot create or delete users rows directly", async () => {
    await expect(
      t.as("authenticated", B, (run) =>
        run(`insert into users (id) values ('00000000-0000-4000-8000-00000000000c')`),
      ),
    ).rejects.toThrow(/row-level security/);
    const deleted = await t.as("authenticated", B, (run) => run(`delete from users where id = $1 returning id`, [B]));
    expect(deleted).toEqual([]);
  });

  it("the owner can read their profile entry; another user cannot", async () => {
    const own = await t.as("authenticated", A, (run) => run(`select value, user_id from profile_entries`));
    expect(own).toEqual([{ value: "MIT ESP", user_id: A }]);
    const other = await t.as("authenticated", B, (run) => run(`select id from profile_entries`));
    expect(other).toEqual([]);
  });

  it("another user cannot update or delete it", async () => {
    const updated = await t.as("authenticated", B, (run) =>
      run(`update profile_entries set value = 'x' where id = $1 returning id`, [entryA]),
    );
    const deleted = await t.as("authenticated", B, (run) =>
      run(`delete from profile_entries where id = $1 returning id`, [entryA]),
    );
    expect(updated).toEqual([]);
    expect(deleted).toEqual([]);
    const still = await t.as("authenticated", A, (run) => run(`select value from profile_entries`));
    expect(still).toEqual([{ value: "MIT ESP" }]);
  });

  it("a user cannot insert an entry owned by someone else", async () => {
    await expect(
      t.as("authenticated", B, (run) =>
        run(
          `insert into profile_entries (user_id, type, value, est_group_size, source)
           values ($1, 'program', 'planted', 10, 'manual')`,
          [A],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("a user cannot hand their own entry to someone else", async () => {
    const idB = await t.as("authenticated", B, async (run) => {
      const rows = await run<{ id: string }>(
        `insert into profile_entries (type, value, est_group_size, source)
         values ('language', 'Spanish', 1000000, 'manual') returning id`,
      );
      return rows[0].id;
    });
    await expect(
      t.as("authenticated", B, (run) => run(`update profile_entries set user_id = $1 where id = $2`, [A, idB])),
    ).rejects.toThrow(/row-level security/);
  });

  it("voice samples are private to their owner", async () => {
    expect(await t.as("authenticated", B, (run) => run(`select id from voice_samples`))).toEqual([]);
    expect(
      await t.as("authenticated", B, (run) => run(`delete from voice_samples where id = $1 returning id`, [sampleA])),
    ).toEqual([]);
    expect(await t.as("authenticated", A, (run) => run(`select id from voice_samples`))).toHaveLength(1);
  });

  it("the audit log is readable by its actor only and writable by no user", async () => {
    expect(await t.as("authenticated", A, (run) => run(`select action from audit_log`))).toEqual([
      { action: "test.event" },
    ]);
    expect(await t.as("authenticated", B, (run) => run(`select action from audit_log`))).toEqual([]);
    await expect(
      t.as("authenticated", A, (run) => run(`insert into audit_log (actor, action) values ($1, 'forged')`, [A])),
    ).rejects.toThrow(/row-level security/);
  });

  it("a visitor who is not signed in sees nothing", async () => {
    for (const table of ["users", "profile_entries", "voice_samples", "audit_log"]) {
      expect(await t.as("anon", null, (run) => run(`select * from ${table}`)), table).toEqual([]);
    }
    await expect(
      t.as("anon", null, (run) =>
        run(`insert into profile_entries (user_id, type, value, est_group_size, source) values ($1, 'other', 'x', 1, 'manual')`, [A]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("database constraints", () => {
  it("rejects an unknown entry type, a blank name and a zero group size", async () => {
    const insert = (type: string, value: string, size: number) =>
      t.as("authenticated", A, (run) =>
        run(`insert into profile_entries (type, value, est_group_size, source) values ($1, $2, $3, 'manual')`, [
          type,
          value,
          size,
        ]),
      );
    await expect(insert("astronaut", "x", 1)).rejects.toThrow(/check constraint/);
    await expect(insert("program", "   ", 1)).rejects.toThrow(/check constraint/);
    await expect(insert("program", "x", 0)).rejects.toThrow(/check constraint/);
  });

  it("updated_at moves when a row changes", async () => {
    const rows = await t.as("authenticated", A, (run) =>
      run<{ moved: boolean }>(
        `update profile_entries set details = 'Splash' where id = $1 returning updated_at >= created_at as moved`,
        [entryA],
      ),
    );
    expect(rows).toEqual([{ moved: true }]);
  });
});

describe("RLS: goals, plans and plan targets (milestone 2)", () => {
  let goalA: string;
  let planA: string;

  beforeAll(async () => {
    goalA = await t.as("authenticated", A, async (run) => {
      const rows = await run<{ id: string }>(
        `insert into goals (raw_text, industries, year) values ('consulting or finance, idk', '{consulting}', 2028) returning id`,
      );
      return rows[0].id;
    });
    planA = await t.as("authenticated", A, async (run) => {
      const rows = await run<{ id: string }>(`insert into plans (goal_id) values ($1) returning id`, [goalA]);
      await run(
        `insert into plan_targets (plan_id, firm_slug, name, tier, rationale, priority)
         values ($1, 'bcg', 'Boston Consulting Group', 'reach', 'reason', 0)`,
        [rows[0].id],
      );
      return rows[0].id;
    });
  });

  it("the owner sees their goal, plan and targets; another user sees none", async () => {
    const own = await t.as("authenticated", A, (run) => run(`select name from plan_targets`));
    expect(own).toEqual([{ name: "Boston Consulting Group" }]);
    for (const table of ["goals", "plans", "plan_targets"]) {
      const other = await t.as("authenticated", B, (run) => run(`select id from ${table}`));
      expect(other, table).toEqual([]);
    }
  });

  it("another user cannot attach a plan to A's goal or a target to A's plan", async () => {
    await expect(
      t.as("authenticated", B, (run) => run(`insert into plans (goal_id) values ($1)`, [goalA])),
    ).rejects.toThrow(/row-level security/);
    await expect(
      t.as("authenticated", B, (run) =>
        run(`insert into plan_targets (plan_id, name, priority) values ($1, 'x', 0)`, [planA]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("another user cannot change or remove A's targets", async () => {
    const updated = await t.as("authenticated", B, (run) =>
      run(`update plan_targets set name = 'x' where plan_id = $1 returning id`, [planA]),
    );
    const deleted = await t.as("authenticated", B, (run) =>
      run(`delete from plan_targets where plan_id = $1 returning id`, [planA]),
    );
    expect(updated).toEqual([]);
    expect(deleted).toEqual([]);
  });

  it("tier must be reach, target, likely or empty", async () => {
    await expect(
      t.as("authenticated", A, (run) =>
        run(`insert into plan_targets (plan_id, name, tier, priority) values ($1, 'x', 'dream', 1)`, [planA]),
      ),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("account deletion", () => {
  it("removing the account removes every row the user owns", async () => {
    await t.db.query(`delete from auth.users where id = $1`, [A]);
    const left = await t.db.query<{ n: number }>(
      `select (select count(*) from users where id = $1)
            + (select count(*) from profile_entries where user_id = $1)
            + (select count(*) from voice_samples where user_id = $1)
            + (select count(*) from goals where user_id = $1)
            + (select count(*) from plans where user_id = $1)
            + (select count(*) from plan_targets where user_id = $1) as n`,
      [A],
    );
    expect(Number(left.rows[0].n)).toBe(0);
  });
});
