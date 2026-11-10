import { describe, expect, it } from "vitest";
import { parsePublicEnv, parseServerEnv } from "@/lib/env/schema";

const base = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-test-value",
  APP_BASE_URL: "http://localhost:3000",
};

describe("environment validation", () => {
  it("accepts the milestone 0 variables", () => {
    expect(parseServerEnv(base).APP_BASE_URL).toBe("http://localhost:3000");
    expect(parsePublicEnv(base).NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://example.supabase.co",
    );
  });

  it("names the missing variable", () => {
    const { APP_BASE_URL: _omit, ...rest } = base;
    void _omit;
    expect(() => parseServerEnv(rest)).toThrow(/APP_BASE_URL/);
  });

  it("treats an empty string as missing", () => {
    expect(() => parsePublicEnv({ ...base, NEXT_PUBLIC_SUPABASE_ANON_KEY: "" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
    // Optional keys left blank in .env do not fail.
    expect(() => parseServerEnv({ ...base, APOLLO_API_KEY: "" })).not.toThrow();
  });

  it("rejects a malformed URL", () => {
    expect(() => parsePublicEnv({ ...base, NEXT_PUBLIC_SUPABASE_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });

  it("never puts a value in the error message", () => {
    try {
      parseServerEnv({ ...base, APP_BASE_URL: "secret-looking-value" });
      throw new Error("expected a failure");
    } catch (error) {
      expect(String(error)).not.toContain("secret-looking-value");
    }
  });

  it("public env does not expose server variables", () => {
    const parsed = parsePublicEnv({ ...base, SUPABASE_SERVICE_ROLE_KEY: "x" });
    expect(Object.keys(parsed).sort()).toEqual([
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
    ]);
  });
});
