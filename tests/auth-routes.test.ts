import { describe, expect, it } from "vitest";
import { isProtectedPath, safeNextPath } from "@/lib/auth/routes";

describe("route protection", () => {
  it("protects the dashboard and everything under it", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/dashboard/tracker")).toBe(true);
  });

  it("leaves public pages open", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/auth/callback")).toBe(false);
    expect(isProtectedPath("/dashboards")).toBe(false);
  });
});

describe("post-sign-in redirect", () => {
  it("defaults to the dashboard", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
  });

  it("keeps paths inside the app", () => {
    expect(safeNextPath("/dashboard/tracker")).toBe("/dashboard/tracker");
  });

  it("refuses to leave the app", () => {
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
  });
});
