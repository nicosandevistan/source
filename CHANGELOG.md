# Changelog

## Milestone 2 — Plan (2026-11-14)

Added
- Firm catalog: 184 firms in 19 segments across consulting, banking,
  investing, biotech/pharma and tech, with estimated application windows.
- Goal intake: plain words plus optional industries, internship summer,
  locations and firms already in mind.
- Rule-based plan generation (no language model): 5–8 firms with a mix of
  reach, target and likely, each with a reason naming a profile entry, and
  estimated outreach and application dates.
- `/dashboard/plan`: the plan, move firms up or down, remove, add a firm
  (catalog firms get a tier and reason; others are kept as your pick), and
  change the goal. The contact ladder and first ask are shown below.
- `goals`, `plans` and `plan_targets` tables with Row Level Security, and
  tests that one user can't read, add to or change another's plan.

Acceptance criteria
- [x] "consulting or finance, idk" returns 5–8 firms, all from the catalog,
      each with a reason tied to the profile (automated, and checked on the
      owner's profile on localhost: 7 firms).
- [x] Each firm shows its ladder rules, first ask and estimated timeline
      labeled "estimate".

## PDF reading fixes from the owner's real files (2026-11-11)

Fixed
- LinkedIn PDF: company names and degree lines that wrap onto a second line
  were split, so only the last part was kept (for example "(previously
  OEOP)" instead of the full program name). Experience is now read by font
  size (company, title and detail lines each have their own size), and
  wrapped lines are joined.
- Resume: the wrapped second line of a bullet has no bullet mark, so it was
  read as a new employer. Indented lines (and lower-case lines after a
  bullet) are now treated as the rest of the bullet. Combined headings such
  as "LEADERSHIP & PROJECTS" are recognized, "Organization | Title" lines
  are split, and "English and Spanish (bilingual)" gives two languages.
- The same school, language or program from two imports with different
  dates is now merged instead of added twice.

Added
- "Remove the N unchecked from <source>" buttons, to undo a bad import in
  one step and run it again.

## Zero-cost rework of milestone 1 (2026-11-11)

Changed
- LinkedIn PDF import reads LinkedIn's layout with rules (sidebar and main
  column split by text position) instead of an LLM. Resume import uses
  looser heading-based rules. Every entry is still marked "to check" and
  checked against the file's text.
- "Suggest names" uses a built-in catalog of programs, organizations,
  schools and firms, plus spelling rules (acronyms, "&"/"and", company
  suffixes). Free and instant.
- The data export ZIP is listed first as the most accurate import.
- Build plan revised to zero cost (hard rule 9); see DECISIONS.md.

Removed
- `lib/llm/`, the `@anthropic-ai/sdk` package, and the `ANTHROPIC_API_KEY`,
  `APOLLO_API_KEY` and `PDL_API_KEY` settings.

Added
- `scripts/make-test-pdfs.mjs` and two fixtures: a two-column
  LinkedIn-style PDF (multi-role company, descriptions, page footers) and a
  one-column resume. Parser tests check every entry, field by field.

Acceptance criteria (M1)
- [ ] The owner's LinkedIn PDF produces his positions and education with no
      missing or invented entries. **Needs the owner**: no API key needed
      any more, only a Supabase project to sign in to.
- [x] A ZIP missing some CSVs still imports without errors (automated).
- [x] Adding "MIT ESP" by hand yields alias suggestions including
      "Educational Studies Program" (automated, from the catalog).

## Milestone 1 — Profile builder (2026-11-10, awaiting owner checks)

Added
- Profile page (`/dashboard/profile`): import, review, entry-point prompts,
  alternate names, group sizes, voice samples.
- LinkedIn data export import: tolerant CSV reader (missing files, renamed
  columns, notes before the header), opened in the browser so only profile
  files are uploaded.
- LinkedIn PDF and resume import: PDF text extraction, LLM mapping to
  entries, and a code check that flags any entry not found in the text.
- Alias suggestions that are saved only after the user confirms them.
- `profile_entries` and `voice_samples` tables with Row Level Security.
- `LlmClient` interface with Anthropic and fixture implementations.
- 76 new tests (117 total), including real-database tests that user A
  cannot read, change or delete user B's rows.

Acceptance criteria
- [ ] The owner's LinkedIn PDF produces his positions and education with no
      missing or invented entries. **Needs the owner**: a hands-on check
      with his PDF and `ANTHROPIC_API_KEY`. Automated tests cover the
      pipeline with a sample PDF and a canned model reply.
- [x] A ZIP missing some CSVs still imports without errors (automated).
- [ ] Adding "MIT ESP" by hand yields alias suggestions including
      "Educational Studies Program". **Needs the owner**: depends on the
      live model. The automated test covers the plumbing only.

Not yet exercised
- The signed-in profile page has not been opened in a browser, because that
  needs a real Supabase project. Signed-out behavior (redirect to login,
  401 from the import endpoint) was checked.

## Milestone 0 — Foundation (2026-11-10)

Added
- Next.js 16 app (App Router, TypeScript, Tailwind 4, shadcn/ui Button).
- Google sign-in through Supabase Auth with basic scopes only
  (`openid email profile`), sign-out, and a protected, empty dashboard.
- `proxy.ts` session refresh and route guard.
- `config/app.ts` with every tunable from spec sections 7.7, 8 and 14.
- Environment validation in `lib/env/` (zod); `.env.example`.
- First migration: `users` and `audit_log` with Row Level Security, a
  sign-up trigger that creates the `users` row, and `updated_at` handling.
- 41 tests: config defaults, environment validation, route protection and
  redirect safety, RLS-on-every-table guard, secret scanning, and static
  checks for hard rules 1, 7 and 8.
- CI (GitHub Actions): lint, type-check, tests, build, dependency audit.
- Placeholder folders for `lib/engine`, `lib/providers`, `lib/outreach`,
  `lib/policy` and `jobs`.

Acceptance criteria
- [x] Code for "a user can sign in and sees an empty dashboard" is in place
      and the routes were exercised locally. **Not yet confirmed with a real
      Google account**: that needs the owner's Supabase project and Google
      OAuth client (README, steps 2–3).
- [x] CI is green on `main` (lint, type-check, tests, build, audit).
- [x] Secrets come only from environment variables (enforced by tests).
- [ ] Preview deploys: needs the owner to import the repo in Vercel.
