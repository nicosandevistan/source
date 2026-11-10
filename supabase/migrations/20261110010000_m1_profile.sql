-- Milestone 1: profile builder.

-- profile_entries: the user's "entry points" (spec section 6).
create table public.profile_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  type text not null check (type in (
    'employer', 'school', 'program', 'scholarship', 'club', 'affinity_org',
    'hometown', 'high_school', 'language', 'interest', 'volunteer',
    'publication', 'other'
  )),
  value text not null check (length(btrim(value)) > 0),
  aliases text[] not null default '{}',
  -- 'YYYY-MM' or 'YYYY'; LinkedIn rarely gives a full date.
  start_date text,
  end_date text,
  details text,
  est_group_size integer not null check (est_group_size > 0),
  source text not null check (source in ('linkedin_pdf', 'linkedin_export', 'resume', 'manual')),
  use_for_matching boolean not null default true,
  -- True until the user has looked at an entry the app extracted.
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_entries enable row level security;

create policy "profile_entries_select_own" on public.profile_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "profile_entries_insert_own" on public.profile_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profile_entries_update_own" on public.profile_entries
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "profile_entries_delete_own" on public.profile_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

create index profile_entries_user_idx on public.profile_entries (user_id, type);

create trigger profile_entries_set_updated_at
  before update on public.profile_entries
  for each row execute function public.set_updated_at();

-- voice_samples: emails the user wrote before, used to match their voice.
create table public.voice_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  text text not null check (length(btrim(text)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.voice_samples enable row level security;

create policy "voice_samples_select_own" on public.voice_samples
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "voice_samples_insert_own" on public.voice_samples
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "voice_samples_update_own" on public.voice_samples
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "voice_samples_delete_own" on public.voice_samples
  for delete to authenticated using ((select auth.uid()) = user_id);

create index voice_samples_user_idx on public.voice_samples (user_id);

create trigger voice_samples_set_updated_at
  before update on public.voice_samples
  for each row execute function public.set_updated_at();
