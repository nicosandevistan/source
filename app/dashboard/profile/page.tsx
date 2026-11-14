import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { profile } from "@/config/app";
import { requireUser } from "@/lib/auth/user";
import { ENTRY_POINT_PROMPTS } from "@/lib/engine/profile/entry-points";
import { confirmAllReviewed, deleteVoiceSample, removeUncheckedFromSource } from "@/lib/profile/actions";
import { getProfile } from "@/lib/profile/queries";
import { DashboardHeader } from "../_components/header";
import { EntryCard } from "./_components/entry-card";
import { EntryForm } from "./_components/entry-form";
import { ImportPanel } from "./_components/import-panel";
import { VoiceSampleForm } from "./_components/voice-samples";

export const metadata = { title: "Profile · Common Thread" };

export default function ProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
      <DashboardHeader />
      <main className="space-y-10 py-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
          <p className="text-sm text-neutral-600">
            Everything here is a possible point of connection with someone. You decide what is used.
          </p>
        </div>

        <Section title="1. Import" hint="Files are read once and not stored.">
          <ImportPanel />
        </Section>

        <Suspense fallback={<p className="text-sm text-neutral-600">Loading your profile…</p>}>
          <ProfileBody />
        </Suspense>
      </main>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-sm text-neutral-600">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

async function ProfileBody() {
  await requireUser();
  const { entries, voiceSamples } = await getProfile();
  const toReview = entries.filter((e) => e.needs_review).length;
  const SOURCE_LABELS = { linkedin_pdf: "LinkedIn PDF", linkedin_export: "LinkedIn export", resume: "resume" } as const;
  const uncheckedBySource = (Object.keys(SOURCE_LABELS) as (keyof typeof SOURCE_LABELS)[])
    .map((source) => ({ source, count: entries.filter((e) => e.needs_review && e.source === source).length }))
    .filter((s) => s.count > 0);
  const have = new Set(entries.map((e) => e.type));

  return (
    <>
      <Section
        title="2. Review your entries"
        hint={
          entries.length === 0
            ? "Nothing yet. Import a file above or add entries below."
            : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}${
                toReview ? `, ${toReview} to check` : ""
              }.`
        }
      >
        {toReview > 0 && (
          <div className="flex flex-wrap gap-2">
            <form action={confirmAllReviewed}>
              <Button type="submit" variant="outline" size="sm">
                I have checked them all
              </Button>
            </form>
            {uncheckedBySource.map(({ source, count }) => (
              <form key={source} action={removeUncheckedFromSource}>
                <input type="hidden" name="source" value={source} />
                <Button type="submit" variant="outline" size="sm">
                  Remove the {count} unchecked from {SOURCE_LABELS[source]}
                </Button>
              </form>
            ))}
          </div>
        )}
        <ul className="space-y-2">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </ul>
      </Section>

      <Section
        title="3. Things LinkedIn usually misses"
        hint="These make the rarest connections. Add any that apply."
      >
        <ul className="space-y-2">
          {ENTRY_POINT_PROMPTS.map((prompt) => (
            <li key={prompt.type} className="rounded-md border border-neutral-200 bg-white p-3">
              <details>
                <summary className="cursor-pointer text-sm font-medium">
                  <span aria-hidden="true">{have.has(prompt.type) ? "☑ " : "☐ "}</span>
                  {prompt.question}
                  {have.has(prompt.type) && <span className="sr-only"> (added)</span>}
                </summary>
                <div className="mt-3">
                  <EntryForm mode="add" type={prompt.type} placeholder={prompt.placeholder} />
                </div>
              </details>
            </li>
          ))}
          <li className="rounded-md border border-neutral-200 bg-white p-3">
            <details>
              <summary className="cursor-pointer text-sm font-medium">Add anything else</summary>
              <div className="mt-3">
                <EntryForm mode="add" />
              </div>
            </details>
          </li>
        </ul>
      </Section>

      <Section
        title="4. How you write"
        hint={`Paste up to ${profile.MAX_VOICE_SAMPLES} emails you wrote before.`}
      >
        <ul className="space-y-2">
          {voiceSamples.map((sample) => (
            <li key={sample.id} className="rounded-md border border-neutral-200 bg-white p-3">
              <p className="line-clamp-3 text-sm whitespace-pre-wrap text-neutral-700">{sample.text}</p>
              <form action={deleteVoiceSample} className="mt-2">
                <input type="hidden" name="id" value={sample.id} />
                <Button type="submit" variant="ghost" size="sm" className="text-red-700 hover:bg-red-50">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
        {voiceSamples.length < profile.MAX_VOICE_SAMPLES && <VoiceSampleForm />}
      </Section>
    </>
  );
}
