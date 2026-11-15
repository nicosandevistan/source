"use server";

import { createHash } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { evidence as evidenceConfig } from "@/config/app";
import { requireUser } from "@/lib/auth/user";
import { fetchPage } from "@/lib/engine/evidence/fetch";
import { uuid } from "@/lib/profile/validation";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true; note?: string } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });
const hash = (text: string) => createHash("sha256").update(text).digest("hex");

async function db() {
  await requireUser();
  return createClient();
}

const line = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max));

const pasted = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().max(evidenceConfig.MAX_PASTED_CHARS, "That text is too long. Paste only the part about them."));

/** Adds someone by hand, optionally with text the user read about them (spec "Manual" adapter). */
export async function addPerson(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      full_name: line(200).pipe(z.string().min(3, "Enter their full name.")),
      company: line(200).pipe(z.string().min(1, "Enter where they work.")),
      title: line(300),
      text: pasted,
    })
    .safeParse({
      full_name: form.get("full_name") ?? "",
      company: form.get("company") ?? "",
      title: form.get("title") ?? "",
      text: form.get("text") ?? "",
    });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  if (!parsed.data.full_name.includes(" ")) return fail("Enter their first and last name.");

  const supabase = await db();
  const { data: person, error } = await supabase
    .from("people")
    .insert({ source: "manual", full_name: parsed.data.full_name, company: parsed.data.company, title: parsed.data.title })
    .select("id")
    .single();
  if (error || !person) return fail("Could not add them.");
  if (parsed.data.text) {
    await supabase.from("evidence").insert({
      person_id: person.id,
      kind: "pasted",
      extracted_text: parsed.data.text,
      text_hash: hash(parsed.data.text),
    });
  }
  refresh();
  return { ok: true };
}

export async function removePerson(form: FormData): Promise<void> {
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return;
  const supabase = await db();
  await supabase.from("people").delete().eq("id", id.data);
  refresh();
}

export async function removeAllConnections(): Promise<void> {
  const supabase = await db();
  await supabase.from("people").delete().eq("source", "connections");
  refresh();
}

async function pageCount(supabase: Awaited<ReturnType<typeof db>>, personId: string) {
  const { count } = await supabase.from("evidence").select("id", { count: "exact", head: true }).eq("person_id", personId);
  return count ?? 0;
}

/** Fetches a public page about a person (source policy applies) and keeps its text for 30 days. */
export async function addPage(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const personId = uuid.safeParse(form.get("person_id"));
  const url = z.string().trim().min(1, "Paste a link.").max(2000).safeParse(form.get("url") ?? "");
  if (!personId.success) return fail("Unknown person.");
  if (!url.success) return fail(url.error.issues[0]?.message ?? "Paste a link.");

  const supabase = await db();
  const { data: person } = await supabase.from("people").select("id").eq("id", personId.data).single();
  if (!person) return fail("Unknown person.");
  if ((await pageCount(supabase, person.id)) >= evidenceConfig.MAX_PAGES_PER_PERSON) {
    return fail(`You can keep ${evidenceConfig.MAX_PAGES_PER_PERSON} pages per person. Remove one first.`);
  }

  const page = await fetchPage(url.data.startsWith("http") ? url.data : `https://${url.data}`);
  if (!page.ok) return fail(page.error);
  const { error } = await supabase.from("evidence").insert({
    person_id: person.id,
    kind: "web",
    url: page.url,
    domain: page.host,
    extracted_text: page.text,
    text_hash: hash(page.text),
  });
  if (error) return fail("Could not save that page.");
  refresh();
  return { ok: true };
}

/** Keeps text the user pasted about a person (for pages that can't be fetched, like LinkedIn). */
export async function addText(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const personId = uuid.safeParse(form.get("person_id"));
  const text = pasted.pipe(z.string().min(20, "Paste a little more text.")).safeParse(form.get("text") ?? "");
  if (!personId.success) return fail("Unknown person.");
  if (!text.success) return fail(text.error.issues[0]?.message ?? "Paste some text.");
  const supabase = await db();
  const { data: person } = await supabase.from("people").select("id").eq("id", personId.data).single();
  if (!person) return fail("Unknown person.");
  if ((await pageCount(supabase, person.id)) >= evidenceConfig.MAX_PAGES_PER_PERSON) {
    return fail(`You can keep ${evidenceConfig.MAX_PAGES_PER_PERSON} pages per person. Remove one first.`);
  }
  const { error } = await supabase
    .from("evidence")
    .insert({ person_id: person.id, kind: "pasted", extracted_text: text.data, text_hash: hash(text.data) });
  if (error) return fail("Could not save that text.");
  refresh();
  return { ok: true };
}

export async function removeEvidence(form: FormData): Promise<void> {
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return;
  const supabase = await db();
  await supabase.from("evidence").delete().eq("id", id.data);
  refresh();
}
