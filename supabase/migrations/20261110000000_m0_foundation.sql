-- Milestone 0: foundation.
-- Rule for every migration: each new table enables Row Level Security in the
-- same file and gets at least one policy. tests/rls-migrations.test.ts fails
-- the build if a table is created without both.

-- Keeps updated_at current on any table that attaches this trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- users: account and settings (spec section 6).
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  school text,
  grad_year integer,
  timezone text,
  -- null means "use the default in config/app.ts"; the allowed range is
  -- checked on the server against config, so no number is repeated here.
  daily_send_cap integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users_select_own" on public.users
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "users_update_own" on public.users
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Rows are created by the trigger below and removed by the cascade from
-- auth.users, so there are no insert or delete policies.

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Create the users row when someone signs in for the first time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- audit_log: sends, approvals, deletions (spec section 6).
-- Written only by server code using the service role, which bypasses RLS.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users (id) on delete set null,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "audit_log_select_own" on public.audit_log
  for select to authenticated
  using ((select auth.uid()) = actor);

create index audit_log_actor_idx on public.audit_log (actor, created_at desc);
