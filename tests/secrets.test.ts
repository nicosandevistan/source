import { describe, expect, it } from "vitest";
import { listFiles, read } from "./helpers/files";

const SOURCE_DIRS = ["app", "components", "config", "lib", "jobs", "extension", "proxy.ts"];
const sourceFiles = listFiles(...SOURCE_DIRS).filter((f) => /\.(ts|tsx|mts|js|mjs)$/.test(f));

// Everything that gets committed, minus lockfiles and this test.
const committed = listFiles(".").filter(
  (f) =>
    !f.endsWith("package-lock.json") &&
    !f.startsWith("tests/secrets.test.ts") &&
    !/\.(ico|png|jpg|jpeg|gif|webp)$/.test(f) &&
    (f === ".env.example" || !f.startsWith(".env")),
);

const SECRET_PATTERNS: [string, RegExp][] = [
  ["Anthropic key", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["JWT (Supabase key)", /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/],
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{10,}/],
  ["Google client secret", /GOCSPX-[A-Za-z0-9_-]{10,}/],
  ["Google API key", /AIza[A-Za-z0-9_-]{30,}/],
  ["Resend key", /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

describe("secrets (hard rule 7)", () => {
  it("has files to scan", () => {
    expect(sourceFiles.length).toBeGreaterThan(5);
  });

  it.each(SECRET_PATTERNS)("no %s is committed", (_name, pattern) => {
    const hits = committed.filter((f) => pattern.test(read(f)));
    expect(hits).toEqual([]);
  });

  it(".env.example has names only, no values", () => {
    const filled = read(".env.example")
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .filter((line) => {
        const value = line.slice(line.indexOf("=") + 1);
        return value !== "" && !line.startsWith("APP_BASE_URL=");
      });
    expect(filled).toEqual([]);
  });

  it("process.env is read only inside lib/env", () => {
    const offenders = sourceFiles.filter(
      (f) => !f.startsWith("lib/env/") && /process\.env/.test(read(f)),
    );
    expect(offenders).toEqual([]);
  });

  it("client components never import server-only modules", () => {
    const offenders = sourceFiles.filter((f) => {
      const text = read(f);
      const isClient = /^\s*["']use client["']/.test(text);
      return (
        isClient &&
        /from ["']@\/lib\/(env\/server|supabase\/server|auth\/user|llm\/anthropic|profile\/(queries|save))["']/.test(text)
      );
    });
    expect(offenders).toEqual([]);
  });

  it("modules that can see server secrets are marked server-only", () => {
    for (const file of [
      "lib/env/server.ts",
      "lib/supabase/server.ts",
      "lib/auth/user.ts",
      "lib/llm/anthropic.ts",
      "lib/profile/queries.ts",
      "lib/profile/save.ts",
    ]) {
      expect(read(file), file).toMatch(/^import "server-only";/);
    }
  });

  it("only NEXT_PUBLIC_ variables are named in the browser-safe env module", () => {
    const names = read("lib/env/public.ts").match(/process\.env\.([A-Z0-9_]+)/g) ?? [];
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name).toMatch(/^process\.env\.NEXT_PUBLIC_/);
    }
  });
});

describe("hard rules that can be checked statically", () => {
  it("no code asks for a Gmail scope other than gmail.send (rule 8)", () => {
    const offenders = sourceFiles.filter((f) =>
      /gmail\.(readonly|modify|compose|metadata|insert|labels|settings)|mail\.google\.com\/?["'`]/.test(
        read(f),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("no code makes a request to linkedin.com (rule 1)", () => {
    const offenders = sourceFiles.filter((f) =>
      /fetch\([^)]*linkedin\.com|https?:\/\/(www\.)?linkedin\.com\/(voyager|in\/|search)/.test(
        read(f),
      ),
    );
    expect(offenders).toEqual([]);
  });
});
