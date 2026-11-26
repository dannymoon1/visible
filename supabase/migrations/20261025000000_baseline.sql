-- Baseline: the starting tables the later migrations build on.
--
-- These were first made by hand in the old Supabase dashboard, so no migration
-- created them. This file (written 2026-11-23, when the project moved to a new
-- Supabase project) recreates them from the app's code and generated types, so
-- a new project can be built from the migrations folder alone:
--   pnpm supabase db push --db-url "<connection string>"
--
-- Only the original columns are here; each later migration adds its own.

-- ---------------------------------------------------------------
-- profiles: one per account, created by the sign-up trigger below
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text,
  balance numeric default 0,
  is_admin boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- New accounts get a profile, with the username they chose at sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data ->> 'username'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- tasks: campaigns
-- ---------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  platform text,
  link text,
  reward numeric,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

-- ---------------------------------------------------------------
-- submissions: a creator's post for a campaign, one per campaign
-- ---------------------------------------------------------------
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  status text default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (task_id, user_id)
);

alter table public.submissions enable row level security;

-- ---------------------------------------------------------------
-- withdrawals: payout requests
-- ---------------------------------------------------------------
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  amount numeric not null,
  bank_details text not null,
  method text not null,
  status text default 'pending',
  rejection_reason text,
  created_at timestamptz default now(),
  constraint fk_withdrawals_profile foreign key (user_id) references public.profiles (id) on delete cascade
);

alter table public.withdrawals enable row level security;

-- Creators see their own payout requests (admins get theirs in the lockdown migration)
drop policy if exists "Users can view own withdrawals" on public.withdrawals;
create policy "Users can view own withdrawals" on public.withdrawals
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------
-- Old balance helpers. Server-only; 20261029_security_lockdown revokes them
-- from the browser roles. Kept so that migration applies as written.
-- ---------------------------------------------------------------
create or replace function public.increment_balance(user_id uuid, amount numeric)
returns void
language sql
security definer
set search_path = public
as $$
  update profiles set balance = coalesce(balance, 0) + amount where id = increment_balance.user_id;
$$;

create or replace function public.decrement_balance(target_user_id uuid, amount_to_subtract numeric)
returns void
language sql
security definer
set search_path = public
as $$
  update profiles set balance = coalesce(balance, 0) - amount_to_subtract where id = target_user_id;
$$;

create or replace function public.reject_withdrawal(withdrawal_id uuid, rejection_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_w record;
begin
  select * into v_w from withdrawals w
  where w.id = reject_withdrawal.withdrawal_id and w.status = 'pending'
  for update;
  if not found then
    raise exception 'Withdrawal not found or already processed';
  end if;
  update withdrawals w
  set status = 'rejected', rejection_reason = reject_withdrawal.rejection_reason
  where w.id = v_w.id;
  update profiles p set balance = coalesce(p.balance, 0) + v_w.amount where p.id = v_w.user_id;
end;
$$;

-- ---------------------------------------------------------------
-- Live updates: the wallet balance and withdrawal status update on screen
-- (RealtimeBalance.tsx, withdraw page). Realtime still applies RLS.
-- ---------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'profiles') then
      alter publication supabase_realtime add table public.profiles;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'withdrawals') then
      alter publication supabase_realtime add table public.withdrawals;
    end if;
  end if;
end;
$$;
