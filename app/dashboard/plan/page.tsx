import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/user";
import { FIRMS, INDUSTRY_LABELS, SEGMENTS, type Industry } from "@/lib/engine/plan/catalog";
import { LADDER, firmBySlug, firstAsk, monthYear, timelineFor } from "@/lib/engine/plan/timeline";
import { moveTarget, removeTarget } from "@/lib/plan/actions";
import { getCurrentPlan, type PlanTarget } from "@/lib/plan/queries";
import { DashboardHeader } from "../_components/header";
import { AddFirm } from "./_components/add-firm";
import { GoalForm } from "./_components/goal-form";

export const metadata = { title: "Plan · Common Thread" };

const TIER_STYLES = {
  reach: "bg-purple-50 text-purple-800 border-purple-200",
  target: "bg-sky-50 text-sky-800 border-sky-200",
  likely: "bg-green-50 text-green-800 border-green-200",
} as const;

export default function PlanPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
      <DashboardHeader />
      <main className="space-y-8 py-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Your plan</h1>
          <p className="text-sm text-neutral-600">
            Firms to target, who to contact first, what to ask for and when to start. Dates are estimates.
          </p>
        </div>
        <Suspense fallback={<p className="text-sm text-neutral-600">Loading your plan…</p>}>
          <PlanBody />
        </Suspense>
      </main>
    </div>
  );
}

async function PlanBody() {
  await requireUser();
  const plan = await getCurrentPlan();
  const today = new Date();
  // Default to next summer, or the one after once this year's recruiting is mostly done.
  const defaultYear = today.getUTCFullYear() + (today.getUTCMonth() >= 5 ? 2 : 1);

  if (!plan) {
    return (
      <section className="space-y-3 rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Start with your goal</h2>
        <GoalForm defaultYear={defaultYear} />
      </section>
    );
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {plan.targets.length} {plan.targets.length === 1 ? "firm" : "firms"} for summer {plan.goal.year}
          </h2>
          <p className="text-xs text-neutral-600">
            {plan.goal.industries.map((i) => INDUSTRY_LABELS[i as Industry] ?? i).join(" · ")}
          </p>
        </div>
        <ol className="space-y-3">
          {plan.targets.map((target, i) => (
            <TargetCard key={target.id} target={target} year={plan.goal.year} today={today} first={i === 0} last={i === plan.targets.length - 1} />
          ))}
        </ol>
        <AddFirm planId={plan.id} firmNames={FIRMS.map((f) => f.name)} />
      </section>

      <section className="space-y-3 rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Same for every firm</h2>
        <div className="space-y-1 text-sm">
          <p className="font-medium">Who to contact, in order</p>
          <ol className="list-decimal space-y-0.5 pl-5 text-neutral-700">
            {LADDER.map((rung) => (
              <li key={rung}>{rung}</li>
            ))}
          </ol>
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-medium">The first ask</p>
          <p className="text-neutral-700">{firstAsk()}</p>
        </div>
      </section>

      <details className="rounded-md border border-neutral-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium">Change your goal</summary>
        <div className="mt-3">
          <GoalForm goal={plan.goal} defaultYear={defaultYear} />
        </div>
      </details>
    </>
  );
}

function TargetCard({
  target,
  year,
  today,
  first,
  last,
}: {
  target: PlanTarget;
  year: number;
  today: Date;
  first: boolean;
  last: boolean;
}) {
  const firm = firmBySlug(target.firm_slug);
  const timeline = firm ? timelineFor(firm, year, today) : null;

  return (
    <li className="rounded-md border border-neutral-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{target.name}</p>
            {target.tier ? (
              <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${TIER_STYLES[target.tier]}`}>{target.tier}</span>
            ) : (
              <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs text-neutral-600">Your pick</span>
            )}
          </div>
          {firm && <p className="text-xs text-neutral-600">{SEGMENTS[firm.segment].label} · {firm.hq}</p>}
          <p className="text-sm text-neutral-800">{target.rationale}</p>
          {timeline && (
            <p className="text-xs text-neutral-600">
              {timeline.status === "probably_closed" ? (
                <>Applications for summer {year} have probably closed (estimate).</>
              ) : (
                <>
                  {timeline.status === "start_now" ? "Start reaching out now" : `Start reaching out in ${monthYear(timeline.outreachFrom)}`}
                  {" · "}applications usually open {monthYear(timeline.opens)} – {monthYear(timeline.closes)} (estimate)
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <form action={moveTarget}>
            <input type="hidden" name="id" value={target.id} />
            <input type="hidden" name="direction" value="up" />
            <Button type="submit" variant="outline" size="sm" disabled={first} aria-label={`Move ${target.name} up`}>
              ↑
            </Button>
          </form>
          <form action={moveTarget}>
            <input type="hidden" name="id" value={target.id} />
            <input type="hidden" name="direction" value="down" />
            <Button type="submit" variant="outline" size="sm" disabled={last} aria-label={`Move ${target.name} down`}>
              ↓
            </Button>
          </form>
          <form action={removeTarget}>
            <input type="hidden" name="id" value={target.id} />
            <Button type="submit" variant="outline" size="sm" aria-label={`Remove ${target.name}`}>
              Remove
            </Button>
          </form>
        </div>
      </div>
    </li>
  );
}
