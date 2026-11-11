# Common Thread

Common Thread (working name) tells a college student who to contact for
recruiting, finds the people most likely to reply because of a rare shared
background, and sends short personal emails the student approves.

The full specification is in [docs/build-plan.md](docs/build-plan.md). It is
the source of truth. Choices made where the spec was silent are in
[DECISIONS.md](DECISIONS.md); progress is in [CHANGELOG.md](CHANGELOG.md).

**Status:** milestone 0 (foundation) is on `main`. Milestone 1 (profile
builder) is built and waiting on one hands-on check listed in the changelog.

**Cost:** zero. Everything runs on free tiers (Supabase Free, Vercel Hobby,
Google sign-in, Gmail API). No language model API and no paid data services;
see hard rule 9 in the build plan.

## Stack

Next.js (App Router) and TypeScript on Vercel, Tailwind and shadcn/ui for the
interface, Supabase for the database, sign-in and files, Vitest for tests.

## Setup

You need Node.js 22 or newer.

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Create the Supabase project

1. Create a project at supabase.com (the free tier is enough).
2. In **Project Settings → API**, copy the project URL and the anon (public)
   key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Run the database migrations. Either paste each file in
   `supabase/migrations/` into the SQL editor in name order, or use the
   Supabase command-line tool:

   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

   Run every file in `supabase/migrations/` in name order. Re-run
   `db push` whenever a new migration appears.

### 3. Turn on Google sign-in

1. In Google Cloud Console, create a project and an **OAuth consent screen**
   (user type: External, publishing status: Testing). Add yourself as a test
   user. Scopes: `openid`, `email`, `profile` only.
2. Create an **OAuth client ID** of type "Web application". Add this
   authorized redirect URI, replacing the project ref:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. In Supabase, open **Authentication → Providers → Google**, turn it on and
   paste the client ID and client secret.
4. In Supabase, open **Authentication → URL Configuration**. Set the Site URL
   to `http://localhost:3000` and add these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-domain>/auth/callback` (once you deploy)
   - `https://*-<your-vercel-team>.vercel.app/auth/callback` (preview deploys)

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000, choose **Get started**, and sign in. You should
land on an empty dashboard with a link to build your profile.

## Deploying (Vercel)

1. Import this GitHub repository in Vercel. Every pull request then gets its
   own preview deploy automatically.
2. In **Project Settings → Environment Variables**, add
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `APP_BASE_URL` (the production URL) for Production. For Preview, set
   `APP_BASE_URL` to the preview domain you want sign-in to return to.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no output files |
| `npm test` | Vitest, all tests |
| `npm run build` | Production build |
| `npm run check` | All four of the above, same as CI |

## Layout

| Path | Contents |
| --- | --- |
| `app/` | Routes and UI |
| `components/ui/` | shadcn/ui components |
| `config/app.ts` | Every tunable number (spec section 14) |
| `lib/env/` | The only place environment variables are read |
| `lib/supabase/`, `lib/auth/` | Database clients and sign-in |
| `lib/engine/profile/` | Profile import: export CSVs, rule-based LinkedIn PDF and resume reading, alias catalog |
| `lib/profile/` | Profile queries, saving and server actions |
| `lib/providers/`, `lib/outreach/`, `lib/policy/`, `jobs/` | Placeholders for later milestones |
| `supabase/migrations/` | Database schema; every table has Row Level Security |
| `tests/` | Vitest tests; `tests/db/` runs the migrations on an in-process Postgres |

## Rules for contributors (people and AI)

The hard rules in section 1 of the build plan are never broken. In short: no
LinkedIn automation, no invented hooks, no email without the user approving
that exact message, no inferring identity, public professional sources only,
server-enforced send caps, secrets only in environment variables, and Gmail
access limited to sending.
