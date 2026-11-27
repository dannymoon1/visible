-- Campaigns go live without admin review (decided 2026-11-24 by the founder,
-- replaces admin review from 2026-11-19; built 2026-11-28).
--
-- The brand checks their own campaign in the builder's Review step, confirms it
-- follows our rules, and pays. /api/campaigns then saves it as 'active': shown
-- to creators from its start date. Admins keep set_campaign_status() to suspend
-- or remove a live campaign that breaks the rules.
--
-- 'pending_review' stays a valid status: a campaign saved without the rules
-- confirmation (an old browser tab) still waits for an admin, and
-- review_campaign() still approves or rejects it.

alter table public.tasks alter column status set default 'active';

-- When the brand ticked "This campaign follows the rules" before paying
alter table public.tasks add column if not exists rules_accepted_at timestamptz;
