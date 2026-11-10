# Changelog

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
- [x] Lint, type-check, tests and build pass locally with the same commands
      CI runs. **CI itself has not run yet** (it runs on the first push).
- [x] Secrets come only from environment variables (enforced by tests).
- [ ] Preview deploys: needs the owner to import the repo in Vercel.
