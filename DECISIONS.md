# Decisions

Choices made where the build plan was silent or ambiguous. Newest first.
The owner (Nico) can overrule any of these.

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

7. **RLS testing in two layers.** Now: a static test that every table created
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
