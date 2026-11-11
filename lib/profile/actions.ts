"use server";

import { refresh } from "next/cache";
import { profile } from "@/config/app";
import { requireUser } from "@/lib/auth/user";
import { suggestAliases, tidyAliases } from "@/lib/engine/profile/aliases";
import { defaultGroupSize } from "@/lib/engine/profile/group-size";
import type { EntryType } from "@/lib/engine/profile/types";
import { createClient } from "@/lib/supabase/server";
import { entryFields, firstError, uuid, voiceSampleField } from "./validation";

export type ActionResult = { ok: true } | { ok: false; error: string };
const OK: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

function fields(form: FormData) {
  return entryFields.safeParse({
    type: form.get("type"),
    value: form.get("value") ?? "",
    details: form.get("details")?.toString(),
    start_date: form.get("start_date")?.toString(),
    end_date: form.get("end_date")?.toString(),
    est_group_size: form.get("est_group_size")?.toString(),
  });
}

/** Every action runs as the signed-in user, so Row Level Security applies. */
async function db() {
  await requireUser();
  return createClient();
}

export async function addEntry(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = fields(form);
  if (!parsed.success) return fail(firstError(parsed.error));
  const supabase = await db();
  const { est_group_size, ...rest } = parsed.data;
  const { error } = await supabase.from("profile_entries").insert({
    ...rest,
    est_group_size: est_group_size ?? defaultGroupSize(rest.type),
    source: "manual",
  });
  if (error) return fail("Could not save that entry.");
  refresh();
  return OK;
}

export async function updateEntry(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(form.get("id"));
  const parsed = fields(form);
  if (!id.success) return fail("Unknown entry.");
  if (!parsed.success) return fail(firstError(parsed.error));
  const supabase = await db();
  const { est_group_size, ...rest } = parsed.data;
  const { error } = await supabase
    .from("profile_entries")
    .update({
      ...rest,
      est_group_size: est_group_size ?? defaultGroupSize(rest.type),
      // Saving an edit counts as having reviewed the entry.
      needs_review: false,
    })
    .eq("id", id.data);
  if (error) return fail("Could not save your changes.");
  refresh();
  return OK;
}

export async function deleteEntry(form: FormData): Promise<void> {
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return;
  const supabase = await db();
  await supabase.from("profile_entries").delete().eq("id", id.data);
  refresh();
}

export async function setUseForMatching(form: FormData): Promise<void> {
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return;
  const supabase = await db();
  await supabase
    .from("profile_entries")
    .update({ use_for_matching: form.get("use") === "true" })
    .eq("id", id.data);
  refresh();
}

/** Marks every extracted entry as reviewed. */
export async function confirmAllReviewed(): Promise<void> {
  const supabase = await db();
  await supabase.from("profile_entries").update({ needs_review: false }).eq("needs_review", true);
  refresh();
}

export type AliasSuggestions = { ok: true; aliases: string[] } | { ok: false; error: string };

/** Proposes alternate names from the built-in catalog. Nothing is saved until the user confirms. */
export async function suggestEntryAliases(entryId: string): Promise<AliasSuggestions> {
  const id = uuid.safeParse(entryId);
  if (!id.success) return { ok: false, error: "Unknown entry." };
  const supabase = await db();
  const { data, error } = await supabase
    .from("profile_entries")
    .select("type, value, aliases")
    .eq("id", id.data)
    .single();
  if (error || !data) return { ok: false, error: "Unknown entry." };

  const suggestions = suggestAliases({ type: data.type as EntryType, value: data.value });
  const have = new Set((data.aliases as string[]).map((a) => a.toLowerCase()));
  return { ok: true, aliases: suggestions.filter((a) => !have.has(a.toLowerCase())) };
}

/** Replaces an entry's aliases with the list the user confirmed. */
export async function saveAliases(entryId: string, aliases: string[]): Promise<ActionResult> {
  const id = uuid.safeParse(entryId);
  if (!id.success || !Array.isArray(aliases) || aliases.some((a) => typeof a !== "string")) {
    return fail("Could not save alternate names.");
  }
  const supabase = await db();
  const current = await supabase.from("profile_entries").select("value").eq("id", id.data).single();
  if (current.error || !current.data) return fail("Unknown entry.");
  const { error } = await supabase
    .from("profile_entries")
    .update({ aliases: tidyAliases(current.data.value, aliases) })
    .eq("id", id.data);
  if (error) return fail("Could not save alternate names.");
  refresh();
  return OK;
}

export async function addVoiceSample(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = voiceSampleField.safeParse(form.get("text") ?? "");
  if (!parsed.success) return fail(firstError(parsed.error));
  const supabase = await db();
  const { count } = await supabase.from("voice_samples").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= profile.MAX_VOICE_SAMPLES) {
    return fail(`You can keep ${profile.MAX_VOICE_SAMPLES} samples. Remove one first.`);
  }
  const { error } = await supabase.from("voice_samples").insert({ text: parsed.data });
  if (error) return fail("Could not save that sample.");
  refresh();
  return OK;
}

export async function deleteVoiceSample(form: FormData): Promise<void> {
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return;
  const supabase = await db();
  await supabase.from("voice_samples").delete().eq("id", id.data);
  refresh();
}
