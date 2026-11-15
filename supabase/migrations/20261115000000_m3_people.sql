-- Milestone 3: people and evidence (zero-cost discovery).
-- People come only from the user's own LinkedIn connections export or are
-- added by hand, so each row belongs to one user (no shared provider cache).
-- Hooks are computed from evidence when shown, not stored; see DECISIONS.md.

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  source text not null check (source in ('connections', 'manual')),
  full_name text not null check (length(btrim(full_name)) > 0),
  company text not null default '',
  title text not null default '',
  linkedin_url text check (linkedin_url is null or linkedin_url ~* '^https://([a-z]+\.)?linkedin\.com/'),
  -- 'YYYY-MM' when the user connected with them on LinkedIn.
  connected_on text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.people enable row level security;

create policy "people_select_own" on public.people
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "people_insert_own" on public.people
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "people_update_own" on public.people
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "people_delete_own" on public.people
  for delete to authenticated using ((select auth.uid()) = user_id);

create index people_user_company_idx on public.people (user_id, company);

create trigger people_set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

-- evidence: text of a page about a person, fetched at the user's request
-- or pasted by them. Expires after 30 days (spec section 11).
create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  kind text not null check (kind in ('web', 'pasted')),
  url text,
  domain text,
  extracted_text text not null check (length(extracted_text) > 0),
  text_hash text not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'web') = (url is not null))
);

alter table public.evidence enable row level security;

create policy "evidence_select_own" on public.evidence
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "evidence_insert_own" on public.evidence
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.people p where p.id = person_id and p.user_id = (select auth.uid()))
  );
create policy "evidence_delete_own" on public.evidence
  for delete to authenticated using ((select auth.uid()) = user_id);

create index evidence_person_idx on public.evidence (person_id);

create trigger evidence_set_updated_at
  before update on public.evidence
  for each row execute function public.set_updated_at();
