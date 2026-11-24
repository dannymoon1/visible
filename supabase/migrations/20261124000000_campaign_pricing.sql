-- Campaign pricing, version 2 (plan: docs/plans/pricing-and-pay.md, step A2).
--
-- Campaigns paid for under the rules decided on 22–24 November 2026 store
-- their own pay terms, worked out by src/lib/pricing.ts when the brand pays:
--   - the fee is added on top of the budget (10% launch fee until 31 Jan 2027, then 20%)
--   - verified: 30% of the budget pays per post (post_pool = spots × post_rate),
--     the rest pays for views (view_pool)
--   - open: the whole budget pays for views
--   - every post's view pay stops at max_view_payout; open posts earn nothing
--     under view_floor (1,000) views, verified posts are paid from the first view
--
-- Older campaigns are pricing_version 1 and keep reward / pay_model as before.
-- This only adds columns; no existing campaign changes.

alter table public.tasks
  add column if not exists pricing_version smallint not null default 1,
  add column if not exists budget numeric,
  add column if not exists fee_rate numeric,
  add column if not exists fee_amount numeric,
  add column if not exists post_rate numeric,
  add column if not exists view_rate numeric,
  add column if not exists view_floor integer,
  add column if not exists max_view_payout numeric,
  add column if not exists post_pool numeric,
  add column if not exists view_pool numeric,
  add column if not exists end_date date;

comment on column public.tasks.pricing_version is '1 = one rate (reward + pay_model). 2 = budget + fee, post and view shares (docs/plans/pricing-and-pay.md)';
comment on column public.tasks.budget is 'v2: what creators can earn in total, excluding the fee';
comment on column public.tasks.fee_rate is 'v2: fee rate fixed at payment (0.10 launch fee until 31 Jan 2027, then 0.20)';
comment on column public.tasks.fee_amount is 'v2: the fee charged on top of the budget';
comment on column public.tasks.post_rate is 'v2 verified: what each spot earns for its post';
comment on column public.tasks.view_rate is 'v2: pay per 1,000 verified views';
comment on column public.tasks.view_floor is 'v2: views under this earn nothing (open 1,000, verified 0)';
comment on column public.tasks.max_view_payout is 'v2: the most one post can earn from views';
comment on column public.tasks.post_pool is 'v2: spots × post_rate (0 for open)';
comment on column public.tasks.view_pool is 'v2: budget − post_pool, shared by views';
comment on column public.tasks.end_date is 'v2: last day creators can post (7 to 30 days after start_date)';

-- Version 2 campaigns are paid per post and per view: a new pay_model value.
-- Open v2 campaigns use the existing 'per_1k_views'.
alter table public.tasks drop constraint if exists tasks_pay_model_check;
alter table public.tasks
  add constraint tasks_pay_model_check
  check (pay_model in ('per_post', 'per_1k_views', 'post_and_views'));

alter table public.tasks drop constraint if exists tasks_pricing_version_check;
alter table public.tasks
  add constraint tasks_pricing_version_check check (pricing_version in (1, 2));

-- A version 2 campaign always has its full pay terms, and they add up
alter table public.tasks drop constraint if exists tasks_v2_terms_check;
alter table public.tasks
  add constraint tasks_v2_terms_check check (
    pricing_version = 1
    or (
      budget > 0
      and fee_rate >= 0
      and fee_amount >= 0
      and view_rate > 0
      and view_floor >= 0
      and max_view_payout >= view_rate
      and post_pool >= 0
      and view_pool >= 0
      and post_pool + view_pool = budget
      and end_date is not null
      and (start_date is null or end_date >= start_date)
      and (
        (campaign_type = 'open' and pay_model = 'per_1k_views' and post_pool = 0)
        or (campaign_type = 'verified' and pay_model = 'post_and_views' and post_rate > 0
            and max_participants > 0 and post_pool = max_participants * post_rate)
      )
    )
  );

-- Campaigns about to end, for the closing step (B5) and the campaign lists
create index if not exists tasks_end_date on public.tasks (end_date) where pricing_version = 2;
