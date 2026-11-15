-- Milestone 2: goal and plan.
-- The firm catalog lives in code (lib/engine/plan/catalog.ts), so plans
-- refer to firms by slug; a firm the user typed that is not in the catalog
-- is stored by name (firm_slug null). See DECISIONS.md, milestone 2.

-- goals: what the user wants (spec section 6).
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  raw_text text not null default '',
  industries text[] not null default '{}',
  roles text[] not null default '{}',
  locations text[] not null default '{}',
  known_firms text[] not null default '{}',
  -- The summer the internship is for.
  year integer not null check (year between 2000 and 2100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "goals_select_own" on public.goals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "goals_insert_own" on public.goals
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "goals_update_own" on public.goals
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals_delete_own" on public.goals
  for delete to authenticated using ((select auth.uid()) = user_id);

create index goals_user_idx on public.goals (user_id, created_at desc);

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- plans: one generated plan per goal. The newest is the user's current plan.
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;

create policy "plans_select_own" on public.plans
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "plans_insert_own" on public.plans
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = (select auth.uid()))
  );
create policy "plans_delete_own" on public.plans
  for delete to authenticated using ((select auth.uid()) = user_id);

create index plans_user_idx on public.plans (user_id, created_at desc);

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- plan_targets: the firms in a plan, in the user's order.
create table public.plan_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete cascade,
  firm_slug text,
  name text not null check (length(btrim(name)) > 0),
  industry text,
  tier text check (tier in ('reach', 'target', 'likely')),
  rationale text not null default '',
  priority integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plan_targets enable row level security;

create policy "plan_targets_select_own" on public.plan_targets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "plan_targets_insert_own" on public.plan_targets
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.plans p where p.id = plan_id and p.user_id = (select auth.uid()))
  );
create policy "plan_targets_update_own" on public.plan_targets
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "plan_targets_delete_own" on public.plan_targets
  for delete to authenticated using ((select auth.uid()) = user_id);

create index plan_targets_plan_idx on public.plan_targets (plan_id, priority);

create trigger plan_targets_set_updated_at
  before update on public.plan_targets
  for each row execute function public.set_updated_at();
