"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormError, Input, Label, Textarea } from "@/components/ui/field";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/engine/plan/catalog";
import { createPlan, type ActionResult } from "@/lib/plan/actions";
import type { Goal } from "@/lib/plan/queries";

/** The goal in plain words, plus summer, places and any firms already in mind. */
export function GoalForm({ goal, defaultYear }: { goal?: Goal; defaultYear: number }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(createPlan, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="goal-text">What are you aiming for?</Label>
        <Textarea
          id="goal-text"
          name="raw_text"
          className="min-h-20"
          maxLength={1000}
          defaultValue={goal?.raw_text}
          placeholder="consulting or finance, idk"
        />
        <p className="text-xs text-neutral-600">Plain words are fine. Leave it vague and you get a spread across industries.</p>
      </div>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium text-neutral-800">Industries (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((industry) => (
            <label
              key={industry}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs"
            >
              <input type="checkbox" name="industries" value={industry} defaultChecked={goal?.industries.includes(industry) && goal.raw_text === ""} />
              {INDUSTRY_LABELS[industry]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="goal-year">Internship summer</Label>
          <Input id="goal-year" name="year" type="number" min={2000} max={2100} required defaultValue={goal?.year ?? defaultYear} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="goal-locations">Where would you like to work? (optional)</Label>
          <Input id="goal-locations" name="locations" defaultValue={goal?.locations.join(", ")} placeholder="Boston, New York" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="goal-firms">Firms you already have in mind (optional)</Label>
        <Input id="goal-firms" name="known_firms" defaultValue={goal?.known_firms.join(", ")} placeholder="BCG, Takeda" />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Building your plan…" : goal ? "Build a new plan" : "Build my plan"}
        </Button>
        {goal && <span className="text-xs text-neutral-600">This replaces your current plan.</span>}
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
    </form>
  );
}
