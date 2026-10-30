-- Leaderboard: top creators ranked by approved earnings.
--
-- Returned through a SECURITY DEFINER function so the page only ever
-- receives public-safe fields (display name, @username, stats), never
-- emails, balances or user ids.

-- Post columns (also in 20261029_post_submissions.sql; safe to run twice)
alter table public.submissions
  add column if not exists post_url text,
  add column if not exists post_platform text;

create or replace function public.get_leaderboard(
  p_period text default 'all',   -- 'all' | 'month' (30 days) | 'week' (7 days)
  p_limit int default 50
)
returns table (
  rank bigint,
  display_name text,
  username text,
  approved_posts bigint,
  approval_rate numeric,
  total_earnings numeric,
  campaigns bigint,
  platforms text[],
  last_approved_at timestamptz,
  is_me boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with since as (
    select case p_period
      when 'week' then now() - interval '7 days'
      when 'month' then now() - interval '30 days'
      else '-infinity'::timestamptz
    end as t
  ),
  -- When a submission was decided: paid_at is set on approval
  scoped as (
    select s.user_id, s.task_id, s.status, s.post_platform, t.reward,
           coalesce(s.paid_at, s.created_at) as decided_at
    from submissions s
    join tasks t on t.id = s.task_id
    cross join since
    where coalesce(s.paid_at, s.created_at) >= since.t
  ),
  stats as (
    select
      user_id,
      count(*) filter (where status = 'approved') as approved_posts,
      count(*) filter (where status in ('approved', 'rejected')) as decided,
      coalesce(sum(reward) filter (where status = 'approved'), 0) as total_earnings,
      count(distinct task_id) filter (where status = 'approved') as campaigns,
      array_remove(array_agg(distinct post_platform) filter (where status = 'approved'), null) as platforms,
      max(decided_at) filter (where status = 'approved') as last_approved_at
    from scoped
    group by user_id
  ),
  ranked as (
    select
      rank() over (order by st.total_earnings desc, st.approved_posts desc) as rank,
      coalesce(
        nullif(trim(
          coalesce(u.raw_user_meta_data->>'first_name', '') || ' ' ||
          coalesce(left(u.raw_user_meta_data->>'last_name', 1) || '.', '')
        ), ''),
        p.username,
        'Anonymous creator'
      ) as display_name,
      p.username,
      st.approved_posts,
      round(100.0 * st.approved_posts / nullif(st.decided, 0), 0) as approval_rate,
      st.total_earnings,
      st.campaigns,
      st.platforms,
      st.last_approved_at,
      st.user_id = auth.uid() as is_me
    from stats st
    join profiles p on p.id = st.user_id
    left join auth.users u on u.id = st.user_id
    where st.approved_posts > 0
      and coalesce(p.is_admin, false) = false
  )
  -- Top N, plus the signed-in user's own row if they're further down
  select *
  from ranked
  where rank <= least(greatest(coalesce(p_limit, 50), 1), 100) or is_me
  order by rank, display_name;
$$;

revoke all on function public.get_leaderboard(text, int) from public, anon;
grant execute on function public.get_leaderboard(text, int) to authenticated;
