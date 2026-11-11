# Decisions

Choices made where the build plan was silent or ambiguous. Newest first.
The owner (Nico) can overrule any of these.

## Zero-cost build (2026-11-11)

The owner decided that no part of the app may cost money. This is now hard
rule 9 in the build plan, and every section that named a paid service has a
"Zero-cost:" note. What changed and why:

1. **No language model API.** The Anthropic API was the one cost in
   milestone 1, and it would have grown in milestones 2–5 (planning, hook
   extraction, drafting). Free LLM tiers were ruled out: they change often
   (Google cut the Gemini free tier's limits sharply in 2026) and some may
   use requests to improve the provider's products, which is wrong for users'
   profile data. `lib/llm/`, `@anthropic-ai/sdk` and `ANTHROPIC_API_KEY` are
   removed.

2. **LinkedIn PDF import reads the layout with rules.** LinkedIn's "Save to
   PDF" has a fixed layout, so `lib/engine/profile/parse-linkedin-pdf.ts`
   reads it directly: it splits the sidebar from the main column using text
   positions, then reads Experience blocks (company, optional tenure line,
   title, date line, location), Education (school, then "Degree · (dates)"),
   Languages, Honors-Awards, Certifications and Publications. Resumes vary
   more, so `parse-resume.ts` uses looser rules (headings, then groups of
   non-bullet lines). Every entry is still marked "to check", and the code
   check that a name appears in the file is kept. The data export ZIP is now
   listed first as the most accurate import.

3. **Alias suggestions come from a hand-kept catalog.**
   `lib/engine/profile/alias-catalog.ts` lists common programs, affinity
   organizations, schools and firms with their other names and sub-programs
   (MIT ESP → Educational Studies Program, Splash, Spark, HSSP). Simple rules
   add "&"/"and" swaps, dropped company suffixes and an acronym for names of
   three or more words. The user still confirms every suggestion and can type
   their own. `MAX_ALIASES` went from 8 to 12 so a catalog group is not cut
   short.

4. **People data comes from the user's own connections, not a paid
   provider.** Apollo and People Data Labs are dropped (Apollo's API access
   may need a paid plan; PDL's useful plan has a monthly minimum). Discovery
   (M3) will search the user's Connections.csv and people they add by hand.
   This narrows discovery to people the user is already linked to, which the
   owner accepted.

5. **Emails: user-entered first, then Hunter's free plan, then a labeled
   guess.** The pattern guess is always marked "unverified".

6. **No Inngest or Resend for now.** Background work will run from a jobs
   table via Vercel's free cron or on request (settled at M3). The daily
   digest becomes an in-app "Today" page; intro requests are in-app notices.

7. **Budget is $0.** `MONTHLY_BUDGET_USD_PER_USER` is 0 and the usage ledger
   is replaced by per-adapter free-quota tracking.

8. **Hosting stays on free tiers.** Supabase Free pauses a project after a
   week of low activity (restore it for free, or add a scheduled ping).
   Vercel Hobby is for non-commercial use, which fits a tool for the owner
   and friends; charging for the app later would need Vercel's paid plan.

## Milestone 1 (2026-11-10)

1. **Started before the owner confirmed M0 sign-in.** M0's CI is green, but
   signing in with a real Google account still needs the owner's Supabase
   project. The owner said to keep going, so M1 was built on a branch and
   waits in a pull request for the hands-on checks below.

2. **Uploaded files are read once and never stored.** PDFs are parsed in
   memory and discarded. No Storage bucket is needed yet, and "deletion
   removes uploads" is true by construction.

3. **The export ZIP is opened in the browser.** Only the profile CSVs
   (positions, education, languages, volunteering, honors, projects, skills,
   courses, certifications) are sent to the server. Messages, connections
   and everything else never leave the user's device. This also avoids
   upload size limits, since a full export can be large.

4. **Imports save straight away, marked "to check".** Imported entries are
   saved with `needs_review = true` and edited in place, rather than held in
   a separate draft step. `needs_review` is an added column (not in spec
   section 6). Entries from the export ZIP are the user's own structured
   data, so they are not marked.

5. **Invented entries are flagged, not silently dropped.** (Superseded in
   part: PDFs are now read by rules, not an LLM, but the check stays.)
   After the LLM reads a PDF, code checks that each entry's name appears in the PDF text
   (ignoring case, accents and punctuation, whole words only). An entry that
   fails is kept, shown with a warning, and switched off for matching until
   the user confirms it. Dropping it could hide a real entry the model had
   reworded; keeping it visible lets the user decide.

6. **Skills, courses, certifications and projects import switched off for
   matching.** They rarely make a good hook and would crowd the list. The
   user can switch any of them on.

7. **Profile.csv is not turned into an entry.** Its location field is where
   the user lives now, which is not a hometown. Hometown comes from the
   entry-point prompt.

8. **Dates are stored as text, `YYYY-MM` or `YYYY`.** LinkedIn rarely gives a
   full date, and a date column would force a made-up day.

9. **Default group sizes for entry types the spec's table does not list**
   (`config/app.ts`, `entryTypeToHookType`): scholarship, club and
   publication use the small-program size (200); volunteer uses the
   affinity-organization size (5,000); "other" uses the employer size
   (5,000). Larger guesses were chosen where unsure, because a larger group
   scores as less rare and so never overstates a connection.

10. **Row Level Security tests run on PGlite.** PGlite is Postgres compiled
    to run inside the test process, so the tests apply the real migrations
    and run real queries as two different users with no Docker. A small shim
    (`tests/db/harness.ts`) stands in for Supabase's `auth` schema and
    roles. This replaces the Docker plan in M0 decision 7.

11. *(Superseded by the zero-cost build: no LLM.)* **LLM calls use the Anthropic SDK's structured output**
    (`messages.parse` with a zod schema), and the reply is checked against
    the schema again in our code. All LLM access goes through the
    `LlmClient` interface, with a fixture client for tests.

12. *(Superseded: aliases now come from a catalog, tested directly.)* **The alias test uses a canned reply.** It proves the plumbing and the
    tidy-up rules, not the model's knowledge. Whether the real model
    suggests "Educational Studies Program" for "MIT ESP" is a hands-on check
    for the owner (needs `ANTHROPIC_API_KEY`).

13. *(Superseded: no paid calls to record.)* **LLM cost is not recorded yet.** The spec puts `usage_ledger` in
    milestone 3. Until then the two M1 calls (PDF extraction, alias
    suggestions) are not logged. Each is a single small request.

14. **Up to 2 voice samples**, 40 to 4,000 characters each (in config).

## Milestone 0 (2026-11-10)

1. **Repository.** The code lives in `nicosandevistan/source` (owner's choice).
   The app is still called Common Thread; the npm package name is
   `common-thread`.

2. **Google sign-in goes through Supabase Auth.** Supabase's Google provider
   handles sign-in with `openid email profile`. The spec lists Supabase for
   auth, so this is the simplest fit. Consequence for milestone 4: the
   `gmail.send` grant will be a separate Google OAuth flow run by the app
   (using `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`), so the app can store
   its own encrypted refresh token. That is why those two variables are
   optional until milestone 4.

3. **Environment variables become required in the milestone that first uses
   them.** Milestone 0 needs only `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `APP_BASE_URL`. The rest are declared
   in `lib/env/schema.ts` as optional so the app runs today without keys for
   services it does not call yet.

4. **Only `lib/env/` reads `process.env`.** A test fails if any other source
   file does. Server-only modules import `server-only`, so importing one from
   browser code breaks the build.

5. **Tables arrive with the milestone that uses them.** Milestone 0 creates
   `users` and `audit_log` only. Creating all of section 6 now would mean
   guessing columns before the code that needs them exists.

6. **`users.daily_send_cap` is nullable.** Null means "use `DAILY_SEND_CAP`
   from config". The 1–15 range is checked on the server against config
   rather than repeated as a database constraint, so the number lives in one
   place.

7. **RLS testing in two layers** (the Docker part was replaced by M1 decision 10). Now: a static test that every table created
   in a migration enables Row Level Security, has a policy, and never uses
   `using (true)`. From milestone 1: tests that run real queries as two users
   against a local Supabase database in CI ("user A cannot read user B's
   rows"). They start in milestone 1 because that is when the first tables
   holding user content exist, and they need Docker, which the environment
   this milestone was built in does not have.

8. **Test runner: Vitest.** The spec does not name one.

9. **Next.js 16 defaults kept.** `create-next-app` turned on Cache Components
   and Partial Prefetching. Kept, because they are the current defaults. The
   practical effect: anything that reads the session sits inside a
   `<Suspense>` boundary, and the request hook file is `proxy.ts` (the new
   name for `middleware.ts`).

10. **System fonts.** The template's Google-hosted font was removed so builds
    do not depend on a network download.

11. **shadcn/ui set up by hand.** The shadcn installer could not reach its
    registry from the build environment, so `components.json`,
    `lib/utils.ts` and the Button component were written by hand in the
    standard shadcn shape. `npx shadcn add <component>` works from a normal
    machine.

12. **Dependency audit scope.** CI fails on high-severity advisories in
    packages that ship to users (`npm audit --omit=dev --audit-level=high`).
    On 2026-11-10 the shipped packages had 0 advisories; the lint toolchain
    (typescript-eslint, development only) had 8 moderate ones with no
    non-breaking fix.

13. **Sign-in does not sit behind an allowlist yet.** "Invite-only" is
    currently enforced by Google's testing mode (only named test users can
    sign in). An in-app invite list can be added when needed.
