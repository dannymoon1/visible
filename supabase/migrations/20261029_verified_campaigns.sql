-- Campaigns can only be created by the server after it verifies the
-- payment with Paystack (src/app/api/campaigns/route.js). Before this,
-- the browser inserted tasks directly, so anyone could skip payment.

-- 1. The browser can no longer insert tasks at all
drop policy if exists "Users can create their own campaigns" on public.tasks;
drop policy if exists "Enable insert for all users" on public.tasks;
revoke insert, update, delete on public.tasks from anon, authenticated;

-- 2. One payment = one campaign.
--    A ₦25,000 payment (VISIBLE-1793284687445) created two identical
--    "futurelabs" campaigns on 2026-10-29. Close the copy with no
--    submissions and tag its reference so the unique index can be built.
--    Nothing is deleted.
update public.tasks
set status = 'completed',
    payment_reference = payment_reference || '-duplicate'
where id = '5e363f22-6c47-4cad-9b3c-80b519363fd5'
  and payment_reference = 'VISIBLE-1793284687445';

create unique index if not exists tasks_payment_reference_key
  on public.tasks (payment_reference)
  where payment_reference is not null;
