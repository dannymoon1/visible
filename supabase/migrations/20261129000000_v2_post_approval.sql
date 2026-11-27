-- Approving posts on version-2 campaigns, without moving money (2026-11-28).
--
-- Version-2 campaigns (pricing_version 2) have no single `reward`, so the old
-- approve_submission() refuses their posts. Until Phase B of
-- docs/plans/pricing-and-pay.md builds the earning stages, admins:
--   1. approve the post against the brief (approve_post_v2), optionally with
--      its verified views, and
--   2. enter or correct the views later (set_post_views), from the payout run.
-- Nothing is added to the creator's balance. What each post has earned is
-- worked out from these records by the payout run (/admin/payouts/run,
-- src/lib/payoutRun.ts) and paid by hand on the 5th.

create or replace function public.approve_post_v2(p_submission_id uuid, p_views integer default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_task record;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin access required';
  end if;
  if p_views is not null and p_views < 0 then
    raise exception 'Views can''t be negative.';
  end if;

  select id, user_id, task_id, status into v_sub from submissions where id = p_submission_id for update;
  if not found then
    raise exception 'Post not found';
  end if;
  if v_sub.status <> 'pending' then
    raise exception 'This post has already been reviewed (it is %).', v_sub.status;
  end if;

  select id, title, status, pricing_version into v_task from tasks where id = v_sub.task_id;
  if not found or v_task.pricing_version <> 2 then
    raise exception 'Use the old approval for this campaign.';
  end if;
  if v_task.status in ('suspended', 'removed') then
    raise exception 'This campaign is %. Resume it before approving posts.', v_task.status;
  end if;

  update submissions
  set status = 'approved',
      verified_at = now(),
      verified_views = p_views
  where id = p_submission_id;

  insert into notifications (user_id, kind, title, body, link)
  values (
    v_sub.user_id,
    'post_approved',
    'Post approved: ' || v_task.title,
    'Keep it live for 30 days. What it earns is paid on the 5th of the month after it''s earned.',
    '/submissions'
  );
end;
$$;

revoke all on function public.approve_post_v2(uuid, integer) from public, anon;
grant execute on function public.approve_post_v2(uuid, integer) to authenticated;

-- The verified views for an approved version-2 post (from its insights
-- screenshot). Null clears them.
create or replace function public.set_post_views(p_submission_id uuid, p_views integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin access required';
  end if;
  if p_views is not null and p_views < 0 then
    raise exception 'Views can''t be negative.';
  end if;

  select true into v_ok
  from submissions s join tasks t on t.id = s.task_id
  where s.id = p_submission_id and s.status = 'approved' and t.pricing_version = 2;
  if v_ok is null then
    raise exception 'Only approved posts on new campaigns take views here.';
  end if;

  update submissions set verified_views = p_views where id = p_submission_id;
end;
$$;

revoke all on function public.set_post_views(uuid, integer) from public, anon;
grant execute on function public.set_post_views(uuid, integer) to authenticated;
