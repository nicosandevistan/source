import { z } from "zod";
import { plan } from "@/config/app";
import { INDUSTRIES } from "@/lib/engine/plan/catalog";

const list = (max: number) =>
  z
    .string()
    .optional()
    .transform((s) =>
      [...new Set((s ?? "").split(/[,;\n]/).map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean))]
        .map((x) => x.slice(0, 120))
        .slice(0, max),
    );

export const goalFields = z.object({
  raw_text: z
    .string()
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(z.string().max(plan.GOAL_MAX_CHARS, "That goal is too long.")),
  industries: z.array(z.enum(INDUSTRIES)),
  year: z.coerce
    .number({ message: "Pick the summer this is for." })
    .int()
    .min(2000, "Pick the summer this is for.")
    .max(2100, "Pick the summer this is for."),
  locations: list(plan.MAX_LOCATIONS),
  known_firms: list(plan.MAX_KNOWN_FIRMS),
});

export const firmName = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "Enter a firm name.").max(120, "That name is too long."));
