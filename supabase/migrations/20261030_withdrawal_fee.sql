-- 10% platform fee on every withdrawal.
--
-- The fee comes out of the amount requested: requesting ₦1,000 deducts
-- ₦1,000 from the balance and pays out ₦900. The fee is only earned when
-- the payout completes; reject/cancel refunds the full amount.
--
-- Keep WITHDRAWAL_FEE_RATE / MIN_WITHDRAWAL in src/lib/withdrawals.js in
-- sync with the values below.

alter table public.withdrawals
  add column if not exists fee numeric not null default 0,
  add column if not exists net_amount numeric;

-- Withdrawals made before the fee existed paid out in full
update public.withdrawals set net_amount = amount where net_amount is null;

create or replace function public.request_withdrawal(user_id_input uuid, amount_input numeric, bank_info text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c_fee_rate constant numeric := 0.10;
  c_min_amount constant numeric := 500;
  v_uid uuid := auth.uid();
  v_balance numeric;
  v_fee numeric;
begin
  if v_uid is null then
    raise exception 'Please log in to withdraw.';
  end if;
  if user_id_input is distinct from v_uid then
    raise exception 'You can only withdraw from your own balance.';
  end if;
  if amount_input is null or amount_input < c_min_amount then
    raise exception 'Minimum withdrawal is ₦%.', c_min_amount;
  end if;

  -- Lock the balance so two requests can't spend the same money
  select balance into v_balance from profiles where id = v_uid for update;

  if coalesce(v_balance, 0) < amount_input then
    raise exception 'Insufficient funds!';
  end if;

  v_fee := round(amount_input * c_fee_rate, 2);

  -- Reserve the full amount now; reject/cancel gives it all back
  update profiles set balance = balance - amount_input where id = v_uid;

  insert into withdrawals (user_id, amount, fee, net_amount, bank_details, status, method)
  values (v_uid, amount_input, v_fee, amount_input - v_fee, bank_info, 'pending', 'Bank Transfer');
end;
$$;

revoke execute on function public.request_withdrawal(uuid, numeric, text) from public, anon;
grant execute on function public.request_withdrawal(uuid, numeric, text) to authenticated;
