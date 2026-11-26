-- Security lockdown
--
-- Fixes found in an audit on 2026-10-29:
--   1. profiles (emails, balances) were readable by anyone, even logged out
--   2. increment_balance / decrement_balance / process_payout / reject_payout
--      could be called by anyone to change any user's balance
--   3. request_withdrawal / cancel_withdrawal trusted a user id sent by the
--      browser, and a negative amount would ADD to the balance
--   4. request_withdrawal never actually deducted the balance (it ran with the
--      caller's rights and profiles has no update policy), so reject_payout
--      refunded money that was never taken
--   5. withdrawals (bank details) and submissions were readable by anyone
--   6. anyone could insert tasks, or insert submissions for other users or
--      already marked approved/verified
--
-- New withdrawal flow: the amount is reserved (deducted) when requested,
-- payout just marks it completed, and reject/cancel refunds it.
-- There were no pending withdrawals when this was written, so no existing
-- request is affected by the change.

-- ---------------------------------------------------------------
-- Helper: is the signed-in user an admin? SECURITY DEFINER so policies
-- on profiles can use it without recursing into themselves.
-- ---------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------
-- 1. profiles: own row, or everything for admins.
--    Users may change only their username (never balance or is_admin).
-- ---------------------------------------------------------------
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Users can update own username" on public.profiles;

create policy "Users can view own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "Admins can view all profiles" on public.profiles
  for select to authenticated using (public.is_admin());

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username) on public.profiles to authenticated;

create policy "Users can update own username" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------
-- 2. withdrawals: own rows, or everything for admins.
--    New requests only through request_withdrawal (which reserves funds).
-- ---------------------------------------------------------------
drop policy if exists "Enable read access for all users" on public.withdrawals;
drop policy if exists "Admins can view all withdrawals" on public.withdrawals;
drop policy if exists "Users can insert own withdrawals" on public.withdrawals;

create policy "Admins can view all withdrawals" on public.withdrawals
  for select to authenticated using (public.is_admin());

revoke insert, update, delete on public.withdrawals from anon, authenticated;

-- ---------------------------------------------------------------
-- 3. submissions: own rows, or everything for admins.
--    Users can only create their own, pending, unverified submissions.
-- ---------------------------------------------------------------
drop policy if exists "Enable read access for all users" on public.submissions;
drop policy if exists "Admins can view all submissions" on public.submissions;
drop policy if exists "Allow authenticated selects" on public.submissions;
drop policy if exists "Allow authenticated inserts" on public.submissions;
drop policy if exists "Users can view own submissions" on public.submissions;
drop policy if exists "Users can submit their own proof" on public.submissions;

create policy "Users can view own submissions" on public.submissions
  for select to authenticated using (user_id = auth.uid());

create policy "Admins can view all submissions" on public.submissions
  for select to authenticated using (public.is_admin());

create policy "Users can submit their own proof" on public.submissions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and paid_at is null
    and verification_verdict is null
    and quality_score is null
    and verified_at is null
  );

revoke update, delete on public.submissions from anon, authenticated;

-- ---------------------------------------------------------------
-- 4. tasks: still publicly readable (they're open campaigns), but only
--    logged-in users can create them, as themselves, with a fresh budget.
-- ---------------------------------------------------------------
drop policy if exists "Enable insert for all users" on public.tasks;
drop policy if exists "Users can create their own campaigns" on public.tasks;

create policy "Users can create their own campaigns" on public.tasks
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and coalesce(approved_count, 0) = 0
    and coalesce(budget_spent, 0) = 0
    and coalesce(status, 'active') = 'active'
  );

revoke update, delete on public.tasks from anon, authenticated;

-- ---------------------------------------------------------------
-- 5. Balance functions: server-only. Nothing in the app calls these
--    from the browser; the service role keeps access.
-- ---------------------------------------------------------------
revoke execute on function public.increment_balance(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.decrement_balance(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.reject_withdrawal(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------
-- 6. Withdrawal functions: identity from auth.uid(), amounts from the
--    database, never from the browser. Parameter names are unchanged so
--    the existing pages keep working; the id/amount arguments that used
--    to be trusted are now ignored or checked.
-- ---------------------------------------------------------------
create or replace function public.request_withdrawal(user_id_input uuid, amount_input numeric, bank_info text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_balance numeric;
begin
  if v_uid is null then
    raise exception 'Please log in to withdraw.';
  end if;
  if user_id_input is distinct from v_uid then
    raise exception 'You can only withdraw from your own balance.';
  end if;
  if amount_input is null or amount_input <= 0 then
    raise exception 'Enter an amount greater than zero.';
  end if;

  -- Lock the balance so two requests can't spend the same money
  select balance into v_balance from profiles where id = v_uid for update;

  if coalesce(v_balance, 0) < amount_input then
    raise exception 'Insufficient funds!';
  end if;

  -- Reserve the funds now; reject/cancel gives them back
  update profiles set balance = balance - amount_input where id = v_uid;

  insert into withdrawals (user_id, amount, bank_details, status, method)
  values (v_uid, amount_input, bank_info, 'pending', 'Bank Transfer');
end;
$$;

create or replace function public.cancel_withdrawal(withdrawal_id uuid, user_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_w record;
begin
  select * into v_w
  from withdrawals w
  where w.id = cancel_withdrawal.withdrawal_id
    and w.user_id = auth.uid()
    and w.status = 'pending'
  for update;

  if not found then
    raise exception 'Withdrawal could not be canceled. It may already be processed or permission denied.';
  end if;

  update withdrawals w set status = 'canceled' where w.id = v_w.id;
  update profiles p set balance = p.balance + v_w.amount where p.id = v_w.user_id;
end;
$$;

create or replace function public.process_payout(withdrawal_id uuid, user_id uuid, amount_to_subtract numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_w record;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin access required';
  end if;

  select * into v_w from withdrawals w where w.id = process_payout.withdrawal_id for update;

  if not found then
    raise exception 'Withdrawal not found';
  end if;
  if v_w.status <> 'pending' then
    raise exception 'This withdrawal has already been processed';
  end if;

  -- Funds were already reserved by request_withdrawal
  update withdrawals w set status = 'completed' where w.id = v_w.id;
end;
$$;

create or replace function public.reject_payout(withdrawal_id uuid, user_id uuid, amount_to_refund numeric, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_w record;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin access required';
  end if;

  select * into v_w from withdrawals w where w.id = reject_payout.withdrawal_id for update;

  if not found then
    raise exception 'Withdrawal not found';
  end if;
  if v_w.status <> 'pending' then
    raise exception 'This withdrawal has already been processed';
  end if;

  update withdrawals w set status = 'rejected', rejection_reason = reason where w.id = v_w.id;

  -- Refund exactly what was reserved, to the person who requested it
  update profiles p set balance = p.balance + v_w.amount where p.id = v_w.user_id;
end;
$$;

-- Logged-in users only for everything the app calls
revoke execute on function public.request_withdrawal(uuid, numeric, text) from public, anon;
revoke execute on function public.cancel_withdrawal(uuid, uuid) from public, anon;
revoke execute on function public.process_payout(uuid, uuid, numeric) from public, anon;
revoke execute on function public.reject_payout(uuid, uuid, numeric, text) from public, anon;
revoke execute on function public.approve_submission(uuid, uuid) from public, anon;

grant execute on function public.request_withdrawal(uuid, numeric, text) to authenticated;
grant execute on function public.cancel_withdrawal(uuid, uuid) to authenticated;
grant execute on function public.process_payout(uuid, uuid, numeric) to authenticated;
grant execute on function public.reject_payout(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.approve_submission(uuid, uuid) to authenticated;
