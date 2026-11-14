import "server-only";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type Goal = {
  id: string;
  raw_text: string;
  industries: string[];
  locations: string[];
  known_firms: string[];
  year: number;
};

export type PlanTarget = {
  id: string;
  firm_slug: string | null;
  name: string;
  industry: string | null;
  tier: "reach" | "target" | "likely" | null;
  rationale: string;
  priority: number;
};

export type CurrentPlan = { id: string; goal: Goal; targets: PlanTarget[] } | null;

/** The user's newest plan. Row Level Security limits every query to their rows. */
export async function getCurrentPlan(): Promise<CurrentPlan> {
  await connection();
  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("plans")
    .select("id, goal:goals (id, raw_text, industries, locations, known_firms, year)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Could not load your plan.");
  if (!plan) return null;

  const { data: targets, error: targetsError } = await supabase
    .from("plan_targets")
    .select("id, firm_slug, name, industry, tier, rationale, priority")
    .eq("plan_id", plan.id)
    .order("priority");
  if (targetsError) throw new Error("Could not load your plan.");
  return { id: plan.id, goal: plan.goal as unknown as Goal, targets: (targets ?? []) as PlanTarget[] };
}
