import Link from "next/link";
import { Suspense } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/user";
import { candidatesFor, searchQueries, worksAt, type Candidate } from "@/lib/engine/discovery/candidates";
import type { HookEntry } from "@/lib/engine/hooks/find";
import { firmBySlug } from "@/lib/engine/plan/timeline";
import { removeAllConnections, removeEvidence, removePerson } from "@/lib/people/actions";
import { getEvidence, getPeopleAndEntries, type EvidenceRow } from "@/lib/people/queries";
import { getCurrentPlan } from "@/lib/plan/queries";
import { DashboardHeader } from "../_components/header";
import { AddPersonForm, EvidenceForms } from "./_components/forms";
import { ImportConnections } from "./_components/import-connections";

export const metadata = { title: "People · Common Thread" };

const RUNG_LABELS = {
  warm_junior: "1. Warm junior",
  second_hook: "2. Second hook",
  recruiter: "3. Recruiter",
} as const;

const HOOK_LABELS: Record<string, string> = {
  direct_contact: "Direct contact",
  small_program: "Same program",
  employer: "Same employer",
  high_school: "Same high school",
  affinity_org: "Same organization",
  hometown: "Same hometown",
  college: "Same college",
  language: "Shared language",
  interest: "Shared interest",
};

export default function PeoplePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
      <DashboardHeader />
      <main className="space-y-8 py-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">People</h1>
          <p className="text-sm text-neutral-600">
            Who you know at each firm in your plan, ranked by the rarest thing you share. Every shared detail is checked word for
            word against its source.
          </p>
        </div>
        <Suspense fallback={<p className="text-sm text-neutral-600">Loading people…</p>}>
          <PeopleBody />
        </Suspense>
      </main>
    </div>
  );
}

async function PeopleBody() {
  await requireUser();
  const [plan, { people, entries, connectionCount }] = await Promise.all([getCurrentPlan(), getPeopleAndEntries()]);

  const targets = (plan?.targets ?? []).map((t) => ({ target: t, firm: firmBySlug(t.firm_slug) ?? null }));
  const relevant = people.filter((p) => targets.some(({ target, firm }) => worksAt(p, firm, firm ? null : target.name)));
  const { rows, stored } = await getEvidence(relevant.map((p) => p.id));

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your people</h2>
        <ImportConnections count={connectionCount} />
        {connectionCount > 0 && (
          <form action={removeAllConnections}>
            <Button type="submit" variant="outline" size="sm">
              Remove all imported connections
            </Button>
          </form>
        )}
        <details className="rounded-md border border-neutral-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium">Add someone by hand</summary>
          <div className="mt-3">
            <AddPersonForm />
          </div>
        </details>
      </section>

      {!plan ? (
        <section className="space-y-2 rounded-md border border-neutral-200 bg-white p-4 text-sm">
          <p>Make a plan first, so there are firms to look at.</p>
          <Link href="/dashboard/plan" className={buttonVariants({ size: "sm" })}>
            Make a plan
          </Link>
        </section>
      ) : (
        targets.map(({ target, firm }) => {
          const list = candidatesFor(firm, firm ? null : target.name, people, stored, entries);
          return (
            <FirmSection key={target.id} name={target.name} tier={target.tier} list={list} entries={entries} evidenceRows={rows} />
          );
        })
      )}
    </>
  );
}

function FirmSection({
  name,
  tier,
  list,
  entries,
  evidenceRows,
}: {
  name: string;
  tier: string | null;
  list: Candidate[];
  entries: HookEntry[];
  evidenceRows: EvidenceRow[];
}) {
  const rung = (r: keyof typeof RUNG_LABELS) => list.find((c) => c.rung === r)?.person.full_name;
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{name}</h2>
        <p className="text-xs text-neutral-600">
          {tier ? `${tier} · ` : ""}
          {list.length} {list.length === 1 ? "person" : "people"}
        </p>
      </div>
      <ol className="grid gap-1 rounded-md border border-neutral-200 bg-white p-3 text-sm sm:grid-cols-3">
        {(Object.keys(RUNG_LABELS) as (keyof typeof RUNG_LABELS)[]).map((r) => (
          <li key={r}>
            <span className="font-medium">{RUNG_LABELS[r]}:</span>{" "}
            <span className="text-neutral-700">{rung(r) ?? "not found yet"}</span>
          </li>
        ))}
      </ol>
      {list.length === 0 ? (
        <p className="text-sm text-neutral-600">No one you know works here yet. Add someone you find, by hand.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => (
            <CandidateCard key={c.person.id} c={c} entries={entries} pages={evidenceRows.filter((e) => e.person_id === c.person.id)} />
          ))}
        </ul>
      )}
      <details className="rounded-md border border-neutral-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-medium">Add someone at {name}</summary>
        <div className="mt-3">
          <AddPersonForm company={name} />
        </div>
      </details>
    </section>
  );
}

function CandidateCard({ c, entries, pages }: { c: Candidate; entries: HookEntry[]; pages: EvidenceRow[] }) {
  const { person, score } = c;
  return (
    <li className="space-y-2 rounded-md border border-neutral-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">
            {person.linkedin_url ? (
              <a href={person.linkedin_url} target="_blank" rel="noreferrer noopener" className="underline-offset-2 hover:underline">
                {person.full_name}
              </a>
            ) : (
              person.full_name
            )}
            {c.rung && <span className="ml-2 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-800">{RUNG_LABELS[c.rung]}</span>}
          </p>
          <p className="text-xs text-neutral-600">
            {[person.title, person.company].filter(Boolean).join(" · ")}
            {c.junior && " · junior"}
            {c.recruiter && " · recruiter"}
            {person.source === "manual" && " · added by you"}
          </p>
        </div>
        <details className="text-right text-xs">
          <summary className="cursor-pointer font-medium">Score {Math.round(score.total * 100)}</summary>
          <dl className="mt-1 grid grid-cols-2 gap-x-3 text-left text-neutral-700">
            <dt>Shared background</dt>
            <dd>+{Math.round(score.hooks * 100)}</dd>
            <dt>Early in career</dt>
            <dd>+{Math.round(score.junior * 100)}</dd>
            <dt>Same school</dt>
            <dd>+{Math.round(score.alum * 100)}</dd>
            <dt>Mentors students</dt>
            <dd>+{Math.round(score.mentor * 100)}</dd>
          </dl>
        </details>
      </div>

      {c.hooks.length > 0 && (
        <ul className="space-y-1.5">
          {c.hooks.map((h) => (
            <li key={`${h.entryId}-${h.evidenceId}`} className="rounded-md bg-neutral-50 p-2 text-sm">
              <p className="text-xs font-medium text-neutral-700">
                {HOOK_LABELS[h.hookType] ?? h.hookType}: {h.entryValue}
                {h.timeOverlap && " · same time as you"}
              </p>
              <p className="text-neutral-800">&ldquo;{h.quote}&rdquo;</p>
              <p className="text-xs text-neutral-600">
                {h.source === "record" ? (
                  h.url ? (
                    <a href={h.url} target="_blank" rel="noreferrer noopener" className="underline">
                      From your LinkedIn connections
                    </a>
                  ) : (
                    "From your LinkedIn connections"
                  )
                ) : h.url ? (
                  <a href={h.url} target="_blank" rel="noreferrer noopener" className="underline">
                    Source: {new URL(h.url).hostname}
                  </a>
                ) : (
                  "Source: text you pasted"
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
      {c.unconfirmed.length > 0 && (
        <details className="text-xs text-neutral-600">
          <summary className="cursor-pointer">
            {c.unconfirmed.length} more that may be a different person (the page doesn&apos;t name {person.company || "their company"})
          </summary>
          <ul className="mt-1 space-y-1">
            {c.unconfirmed.map((h) => (
              <li key={`${h.entryId}-${h.evidenceId}`}>
                {h.entryValue}: &ldquo;{h.quote}&rdquo;{" "}
                {h.url && (
                  <a href={h.url} target="_blank" rel="noreferrer noopener" className="underline">
                    source
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      <details>
        <summary className="cursor-pointer text-xs font-medium text-neutral-700">
          Look for shared background{pages.length ? ` (${pages.length} ${pages.length === 1 ? "source" : "sources"} saved)` : ""}
        </summary>
        <div className="mt-2 space-y-3">
          <div className="space-y-1 text-xs">
            <p className="text-neutral-600">Search the web yourself, then add a page you find:</p>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {searchQueries(person, entries).map((q) => (
                <li key={q}>
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer noopener" className="underline">
                    {q}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {pages.length > 0 && (
            <ul className="space-y-1 text-xs">
              {pages.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-neutral-700">
                    {p.kind === "web" && p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer noopener" className="underline">
                        {p.domain}
                      </a>
                    ) : (
                      "Text you pasted"
                    )}
                  </span>
                  <form action={removeEvidence}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="text-red-700 underline">
                      remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <EvidenceForms personId={person.id} />
          {person.source === "manual" && (
            <form action={removePerson}>
              <input type="hidden" name="id" value={person.id} />
              <button type="submit" className="text-xs text-red-700 underline">
                Remove {person.full_name}
              </button>
            </form>
          )}
        </div>
      </details>
    </li>
  );
}
