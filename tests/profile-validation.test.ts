import { describe, expect, it } from "vitest";
import { profile } from "@/config/app";
import { entryFields, voiceSampleField } from "@/lib/profile/validation";

const base = { type: "program", value: "MIT ESP" };

describe("entry form validation", () => {
  it("accepts a minimal entry", () => {
    expect(entryFields.parse(base)).toEqual({
      type: "program",
      value: "MIT ESP",
      details: null,
      start_date: null,
      end_date: null,
      est_group_size: null,
    });
  });

  it("tidies text and dates, and reads group sizes with commas", () => {
    const parsed = entryFields.parse({
      ...base,
      value: "  MIT   ESP ",
      details: " Splash 2022 ",
      start_date: "Nov 2022",
      end_date: "",
      est_group_size: "2,000",
    });
    expect(parsed).toMatchObject({ value: "MIT ESP", details: "Splash 2022", start_date: "2022-11", end_date: null, est_group_size: 2000 });
  });

  it.each([
    [{ ...base, value: "   " }],
    [{ ...base, type: "astronaut" }],
    [{ ...base, start_date: "last summer" }],
    [{ ...base, est_group_size: "0" }],
    [{ ...base, est_group_size: "-5" }],
    [{ ...base, est_group_size: "4.5" }],
    [{ ...base, est_group_size: "lots" }],
    [{ ...base, value: "x".repeat(201) }],
  ])("rejects %o", (input) => {
    expect(entryFields.safeParse(input).success).toBe(false);
  });
});

describe("voice sample validation", () => {
  it("needs a real email, within the size limit", () => {
    expect(voiceSampleField.safeParse("hi").success).toBe(false);
    expect(voiceSampleField.safeParse("x".repeat(profile.VOICE_SAMPLE_MAX_CHARS + 1)).success).toBe(false);
    expect(voiceSampleField.safeParse("Hi Sam, thanks again for speaking with me on Tuesday. Best, Jordan").success).toBe(true);
  });
});
