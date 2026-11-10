import { z } from "zod";
import { profile } from "@/config/app";
import { normalizeDate } from "@/lib/engine/profile/dates";
import { ENTRY_TYPES } from "@/lib/engine/profile/types";

const text = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max));

const optionalDate = z
  .string()
  .optional()
  .transform((s, ctx) => {
    const raw = (s ?? "").trim();
    if (!raw) return null;
    const date = normalizeDate(raw);
    if (!date) {
      ctx.addIssue({ code: "custom", message: "Use a date like 2025 or Jun 2025." });
      return z.NEVER;
    }
    return date;
  });

export const entryFields = z.object({
  type: z.enum(ENTRY_TYPES),
  value: text(200).pipe(z.string().min(1, "Enter a name.")),
  details: text(500).optional().transform((s) => (s ? s : null)),
  start_date: optionalDate,
  end_date: optionalDate,
  est_group_size: z
    .string()
    .optional()
    .transform((s, ctx) => {
      const raw = (s ?? "").replace(/[,\s]/g, "");
      if (!raw) return null;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 1_000_000_000) {
        ctx.addIssue({ code: "custom", message: "Group size must be a whole number above zero." });
        return z.NEVER;
      }
      return n;
    }),
});

export const voiceSampleField = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(profile.VOICE_SAMPLE_MIN_CHARS, "Paste a full email, not just a line.")
      .max(profile.VOICE_SAMPLE_MAX_CHARS, "That is too long. Paste one email."),
  );

export const uuid = z.uuid();

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form.";
}
