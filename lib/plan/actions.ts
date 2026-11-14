"use server";

import { refresh } from "next/cache";
import { plan as planConfig } from "@/config/app";
import { requireUser } from "@/lib/auth/user";
import type { Industry } from "@/lib/engine/plan/catalog";
import { findFirm, generatePlan, type PlanEntry } from "@/lib/engine/plan/generate";
import { parseGoal } from "@/lib/engine/plan/intake";
import { uuid } from "@/lib/profile/validation";
import { createClient } from "@/lib/supabase/server";
import { firmName, goalFields } from "./validation";

export type ActionResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): ActionResult => ({ ok: false, error });

/** Every action runs as the signed-in user, so Row Level Security applies. */
async function db() {
  await requireUser();
  return createClient();
}

async function loadEntries(supabase: Awaited<ReturnType<typeof db>>): Promise<PlanEntry[]> {
  const { data, error } = await supabase
    .from("profile_entries")
    .select("type, value, aliases, details, start_date, use_for_matching");
  if (error) throw new Error("Could not load your profile.");
  return (data ?? []) as PlanEntry[];
}

/** Reads the goal form, builds a plan with the rules in lib/engine/plan, and saves it as the current plan. */
export async function createPlan(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = goalFields.safeParse({
    raw_text: form.get("raw_text") ?? "",
    industries: form.getAll("industries"),
    year: form.get("year"),
    locations: form.get("locations")?.toString(),
    known_firms: form.get("known_firms")?.toString(),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const goal = parsed.data;

  const supabase = await db();
  const entries = await loadEntries(supabase);
  const parsedGoal = parseGoal(goal.raw_text, goal.industries as Industry[]);
  const targets = generatePlan({ goal: parsedGoal, entries, locations: goal.locations, knownFirms: goal.known_firms });
  if (targets.length === 0) return fail("No firms matched that goal. Try naming an industry.");

  const { data: goalRow, error: goalError } = await supabase
    .from("goals")
    .insert({
      raw_text: goal.raw_text,
      industries: parsedGoal.industries,
      locations: goal.locations,
      known_firms: goal.known_firms,
      year: goal.year,
    })
    .select("id")
    .single();
  if (goalError || !goalRow) return fail("Could not save your goal.");

  const { data: planRow, error: planError } = await supabase.from("plans").insert({ goal_id: goalRow.id }).select("id").single();
  if (planError || !planRow) return fail("Could not save your plan.");

  const { error: targetsError } = await supabase.from("plan_targets").insert(
    targets.map((t, priority) => ({
      plan_id: planRow.id,
      firm_slug: t.firmSlug,
      name: t.name,
      industry: t.industry,
      tier: t.tier,
      rationale: t.rationale,
      priority,
    })),
  );
  if (targetsError) return fail("Could not save your plan.");
  refresh();
  return { ok: true };
}

export async function removeTarget(form: FormData): Promise<void> {
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return;
  const supabase = await db();
  await supabase.from("plan_targets").delete().eq("id", id.data);
  refresh();
}

/** Moves a firm one place up or down by swapping priorities with its neighbor. */
export async function moveTarget(form: FormData): Promise<void> {
  const id = uuid.safeParse(form.get("id"));
  const direction = form.get("direction") === "up" ? -1 : 1;
  if (!id.success) return;
  const supabase = await db();
  const { data: target } = await supabase.from("plan_targets").select("plan_id").eq("id", id.data).single();
  if (!target) return;
  const { data: rows } = await supabase
    .from("plan_targets")
    .select("id, priority")
    .eq("plan_id", target.plan_id)
    .order("priority");
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === id.data);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= list.length) return;
  // Renumber so priorities stay unique even if earlier edits left gaps.
  const order = list.map((r) => r.id);
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((rowId, priority) => supabase.from("plan_targets").update({ priority }).eq("id", rowId)));
  refresh();
}

/** Adds a firm the user chooses. A catalog firm gets a tier and reason; any other name is kept as their pick. */
export async function addTarget(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const planId = uuid.safeParse(form.get("plan_id"));
  const name = firmName.safeParse(form.get("name") ?? "");
  if (!planId.success) return fail("Unknown plan.");
  if (!name.success) return fail(name.error.issues[0]?.message ?? "Enter a firm name.");

  const supabase = await db();
  const { data: plan } = await supabase
    .from("plans")
    .select("id, goal:goals (raw_text, industries, locations)")
    .eq("id", planId.data)
    .single();
  if (!plan) return fail("Unknown plan.");
  const { data: rows } = await supabase.from("plan_targets").select("firm_slug, name, priority").eq("plan_id", plan.id);
  const existing = rows ?? [];
  if (existing.length >= planConfig.MAX_TARGET_FIRMS + 4) return fail("That's a lot of firms. Remove one first.");

  const firm = findFirm(name.data);
  const taken = existing.some(
    (r) => (firm && r.firm_slug === firm.slug) || r.name.toLowerCase() === (firm?.name ?? name.data).toLowerCase(),
  );
  if (taken) return fail("That firm is already in your plan.");

  const goal = plan.goal as unknown as { raw_text: string; industries: Industry[]; locations: string[] };
  const entries = await loadEntries(supabase);
  const drafts = generatePlan({
    goal: parseGoal(goal.raw_text, goal.industries),
    entries,
    locations: goal.locations,
    knownFirms: [name.data],
  });
  const draft = drafts.find((d) => (firm ? d.firmSlug === firm.slug : d.name === name.data));
  if (!draft) return fail("Could not add that firm.");

  const { error } = await supabase.from("plan_targets").insert({
    plan_id: plan.id,
    firm_slug: draft.firmSlug,
    name: draft.name,
    industry: draft.industry,
    tier: draft.tier,
    rationale: draft.rationale,
    priority: Math.max(-1, ...existing.map((r) => r.priority)) + 1,
  });
  if (error) return fail("Could not add that firm.");
  refresh();
  return { ok: true };
}
