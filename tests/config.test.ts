import { describe, expect, it } from "vitest";
import { appConfig, googleScopes, hookTypes, limits } from "@/config/app";

describe("config defaults match the spec (section 14)", () => {
  it("send limits", () => {
    expect(limits.DAILY_SEND_CAP).toBe(8);
    expect(limits.DAILY_SEND_CAP_MIN).toBe(1);
    expect(limits.DAILY_SEND_CAP_MAX).toBe(15);
    expect(limits.SEND_SPACING_MINUTES).toBe(4);
    expect(limits.RECIPIENT_COOLDOWN_DAYS).toBe(14);
    expect(limits.MAX_FIRST_TOUCH_PER_RECIPIENT_60D).toBe(2);
    expect(limits.MAX_FIRST_TOUCH_PER_RECIPIENT_60D_CLUB).toBe(1);
    expect(limits.FOLLOWUP_BUSINESS_DAYS).toBe(7);
    expect(limits.MAX_FOLLOWUPS).toBe(1);
  });

  it("discovery, drafting and budget", () => {
    expect(appConfig.discovery.CANDIDATES_PER_FIRM).toBe(50);
    expect(appConfig.discovery.DEEP_DIVE_PER_FIRM).toBe(15);
    expect(appConfig.discovery.MAX_QUERIES_PER_PERSON).toBe(6);
    expect(appConfig.discovery.PEOPLE_TTL_DAYS).toBe(30);
    expect(appConfig.drafting.DRAFT_MAX_WORDS).toBe(110);
    expect(appConfig.drafting.FOLLOWUP_MAX_WORDS).toBe(60);
    expect(appConfig.budget.MONTHLY_BUDGET_USD_PER_USER).toBe(0);
  });

  it("hook weights and default group sizes (section 7.7)", () => {
    expect(hookTypes).toEqual({
      direct_contact: { weight: 1.0, defaultGroupSize: 10 },
      small_program: { weight: 0.8, defaultGroupSize: 200 },
      employer: { weight: 0.7, defaultGroupSize: 5_000 },
      high_school: { weight: 0.7, defaultGroupSize: 2_000 },
      affinity_org: { weight: 0.6, defaultGroupSize: 5_000 },
      hometown: { weight: 0.5, defaultGroupSize: 50_000 },
      college: { weight: 0.4, defaultGroupSize: 30_000 },
      language: { weight: 0.2, defaultGroupSize: 1_000_000 },
      interest: { weight: 0.2, defaultGroupSize: 1_000_000 },
    });
  });

  it("the default cap sits inside the allowed range", () => {
    expect(limits.DAILY_SEND_CAP).toBeGreaterThanOrEqual(limits.DAILY_SEND_CAP_MIN);
    expect(limits.DAILY_SEND_CAP).toBeLessThanOrEqual(limits.DAILY_SEND_CAP_MAX);
  });

  it("the Chrome extension flag is off", () => {
    expect(appConfig.featureFlags.CHROME_EXTENSION).toBe(false);
  });
});

describe("Google scopes (hard rule 8)", () => {
  it("sign-in asks for basic scopes only", () => {
    expect([...googleScopes.SIGN_IN].sort()).toEqual(["email", "openid", "profile"]);
  });

  it("the only Gmail scope anywhere in config is gmail.send", () => {
    const all = JSON.stringify(appConfig);
    const gmailScopes = all.match(/auth\/gmail\.[a-z.]+/g) ?? [];
    expect(gmailScopes).toEqual(["auth/gmail.send"]);
  });
});
