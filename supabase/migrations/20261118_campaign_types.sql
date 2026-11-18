-- Open and Verified campaigns, joining before posting, and notifications
-- (decided 2026-11-18; see CLAUDE.md → The model and the plan in this commit).
--
--   Open:      anyone can join; the budget caps what's paid.
--   Verified:  only verified creators; max_participants spots, first come,
--              first served. Later joiners wait on standby and move up when
--              a spot frees (someone leaves or the manager removes them).
--   Pay:       the brand picks ONE rate: per approved post, or per 1,000
--              verified views (nothing under 1,000 views, none past 5,000).
--
-- Existing campaigns become open, paid per post: nothing changes for them.
-- Nothing is deleted.

-- =========================================================
-- 1. Columns
-- =========================================================

alter table public.tasks
  add column if not exists campaign_type text not null default 'open',
  add column if not exists pay_model text not null default 'per_post',
  add column if not exists notified_at timestamptz;

alter table public.tasks drop constraint if exists tasks_campaign_type_check;
alter table public.tasks
  add constraint tasks_campaign_type_check check (campaign_type in ('open', 'verified'));

alter table public.tasks drop constraint if exists tasks_pay_model_check;
alter table public.tasks
  add constraint tasks_pay_model_check check (pay_model in ('per_post', 'per_1k_views'));

-- Admins switch this on from /admin/creators. Users can still only update
-- their own username (column grant in 20261029_security_lockdown.sql).
alter table public.profiles
  add column if not exists is_verified_creator boolean not null default false;

-- Views-paid campaigns record what was counted and paid for each post
alter table public.submissions
  add column if not exists verified_views integer,
  add column if not exists payout_amount numeric;

-- =========================================================
-- 2. Who has joined which campaign
-- =========================================================

create table if not exists public.campaign_participants (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('joined', 'standby', 'left', 'removed')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, user_id)
);

create index if not exists campaign_participants_queue
  on public.campaign_participants (task_id, status, joined_at);

alter table public.campaign_participants enable row level security;

-- Owner check without reading tasks through its own RLS (avoids a policy loop
-- between tasks and campaign_participants)
create or replace function public.owns_campaign(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from tasks where id = p_task_id and created_by = auth.uid());
$$;

revoke all on function public.owns_campaign(uuid) from public, anon;
grant execute on function public.owns_campaign(uuid) to authenticated;

drop policy if exists "Participants are readable by themselves, owners and admins" on public.campaign_participants;
create policy "Participants are readable by themselves, owners and admins" on public.campaign_participants
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.owns_campaign(task_id));

-- Every change goes through the functions below
revoke insert, update, delete on public.campaign_participants from anon, authenticated;

-- Everyone who already posted for a campaign counts as having joined it
insert into public.campaign_participants (task_id, user_id, status, joined_at)
select s.task_id, s.user_id, 'joined', s.created_at
from public.submissions s
where s.task_id is not null and s.user_id is not null
on conflict (task_id, user_id) do nothing;

-- =========================================================
-- 3. Notifications (shown in the app; emailed by the server)
-- =========================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_recent
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_to_email
  on public.notifications (created_at) where emailed_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Users read their own notifications" on public.notifications;
create policy "Users read their own notifications" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users mark their own notifications read" on public.notifications;
create policy "Users mark their own notifications read" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- =========================================================
-- 4. Who can see campaigns, and who can post
-- =========================================================

-- Campaigns a creator joined stay readable, like ones they posted for
drop policy if exists "Visible campaigns are readable" on public.tasks;
create policy "Visible campaigns are readable" on public.tasks
  for select
  using (
    status in ('active', 'completed')
    or public.is_admin()
    or created_by = auth.uid()
    or exists (
      select 1 from public.submissions s
      where s.task_id = tasks.id and s.user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_participants cp
      where cp.task_id = tasks.id and cp.user_id = auth.uid()
    )
  );

-- Posting now requires having joined (and still holding a spot)
drop policy if exists "Users can submit their own proof" on public.submissions;
create policy "Users can submit their own proof" on public.submissions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and paid_at is null
    and verification_verdict is null
    and quality_score is null
    and verified_at is null
    and verified_views is null
    and payout_amount is null
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.status = 'active'
    )
    and exists (
      select 1 from public.campaign_participants cp
      where cp.task_id = submissions.task_id
        and cp.user_id = auth.uid()
        and cp.status = 'joined'
    )
  );

-- =========================================================
-- 5. Joining, leaving and removing
-- =========================================================

-- Today in Nigeria (start dates are calendar dates)
create or replace function public.lagos_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Africa/Lagos')::date;
$$;

-- Internal: give the earliest standby creator the free spot and tell them.
-- Callers must already hold the task row lock.
create or replace function public.promote_next_standby(p_task_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid;
  v_title text;
begin
  select user_id into v_next
  from campaign_participants
  where task_id = p_task_id and status = 'standby'
  order by joined_at, id
  limit 1
  for update;

  if v_next is null then
    return null;
  end if;

  update campaign_participants
  set status = 'joined', updated_at = now()
  where task_id = p_task_id and user_id = v_next;

  select title into v_title from tasks where id = p_task_id;

  insert into notifications (user_id, kind, title, body, link)
  values (
    v_next,
    'spot_opened',
    'A spot opened up for you',
    'You moved off the standby list for "' || v_title || '". Post about it and submit your link.',
    '/discover/' || p_task_id
  );

  return v_next;
end;
$$;

revoke all on function public.promote_next_standby(uuid) from public, anon, authenticated;

create or replace function public.join_campaign(p_task_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_task record;
  v_existing text;
  v_joined int;
  v_status text;
  v_position int;
begin
  if v_uid is null then
    raise exception 'Please log in to join campaigns.';
  end if;

  -- Lock the campaign so two creators can't take the last spot at once
  select id, status, campaign_type, max_participants, start_date, created_by
  into v_task
  from tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Campaign not found.';
  end if;
  if v_task.status <> 'active' then
    raise exception 'This campaign is not taking new creators.';
  end if;
  if v_task.start_date is not null and v_task.start_date > public.lagos_today() then
    raise exception 'This campaign opens on %.', to_char(v_task.start_date, 'DD Mon YYYY');
  end if;
  if v_task.created_by = v_uid then
    raise exception 'You can''t join your own campaign.';
  end if;

  select status into v_existing
  from campaign_participants
  where task_id = p_task_id and user_id = v_uid;

  if v_existing in ('joined', 'standby') then
    v_status := v_existing;
  elsif v_existing = 'removed' then
    raise exception 'The campaign manager removed you from this campaign.';
  else
    if v_task.campaign_type = 'verified' then
      if not coalesce((select is_verified_creator from profiles where id = v_uid), false) then
        raise exception 'Only verified creators can join this campaign.';
      end if;

      select count(*) into v_joined
      from campaign_participants
      where task_id = p_task_id and status = 'joined';

      v_status := case
        when v_task.max_participants is null or v_joined < v_task.max_participants then 'joined'
        else 'standby'
      end;
    else
      v_status := 'joined';
    end if;

    -- Re-joining after leaving goes to the back of the line
    insert into campaign_participants (task_id, user_id, status, joined_at, updated_at)
    values (p_task_id, v_uid, v_status, now(), now())
    on conflict (task_id, user_id)
    do update set status = excluded.status, joined_at = now(), updated_at = now();
  end if;

  if v_status = 'standby' then
    select count(*) into v_position
    from campaign_participants
    where task_id = p_task_id and status = 'standby'
      and joined_at <= (select joined_at from campaign_participants where task_id = p_task_id and user_id = v_uid);
  end if;

  return json_build_object('status', v_status, 'position', v_position);
end;
$$;

create or replace function public.leave_campaign(p_task_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_type text;
begin
  if v_uid is null then
    raise exception 'Please log in.';
  end if;

  select campaign_type into v_type from tasks where id = p_task_id for update;
  if not found then
    raise exception 'Campaign not found.';
  end if;

  select status into v_status
  from campaign_participants
  where task_id = p_task_id and user_id = v_uid
  for update;

  if v_status is null or v_status not in ('joined', 'standby') then
    raise exception 'You''re not in this campaign.';
  end if;

  if exists (select 1 from submissions where task_id = p_task_id and user_id = v_uid) then
    raise exception 'You''ve already submitted a post for this campaign.';
  end if;

  update campaign_participants
  set status = 'left', updated_at = now()
  where task_id = p_task_id and user_id = v_uid;

  if v_status = 'joined' and v_type = 'verified' then
    perform public.promote_next_standby(p_task_id);
  end if;

  return json_build_object('status', 'left');
end;
$$;

create or replace function public.remove_participant(p_task_id uuid, p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_status text;
  v_promoted uuid;
begin
  select id, title, campaign_type, created_by into v_task
  from tasks where id = p_task_id for update;

  if not found then
    raise exception 'Campaign not found.';
  end if;
  if not (public.is_admin() or v_task.created_by = auth.uid()) then
    raise exception 'Only the campaign manager can remove creators.';
  end if;

  select status into v_status
  from campaign_participants
  where task_id = p_task_id and user_id = p_user_id
  for update;

  if v_status is null or v_status not in ('joined', 'standby') then
    raise exception 'This creator isn''t in the campaign.';
  end if;

  if exists (
    select 1 from submissions
    where task_id = p_task_id and user_id = p_user_id and status in ('approved', 'paid')
  ) then
    raise exception 'This creator''s post is already approved and paid.';
  end if;

  -- A post still waiting for review is closed with the removal
  update submissions
  set status = 'rejected'
  where task_id = p_task_id and user_id = p_user_id and status = 'pending';

  update campaign_participants
  set status = 'removed', updated_at = now()
  where task_id = p_task_id and user_id = p_user_id;

  insert into notifications (user_id, kind, title, body, link)
  values (
    p_user_id,
    'removed',
    'You were removed from a campaign',
    'The manager of "' || v_task.title || '" removed you from the campaign.',
    '/discover/' || p_task_id
  );

  if v_status = 'joined' and v_task.campaign_type = 'verified' then
    v_promoted := public.promote_next_standby(p_task_id);
  end if;

  return json_build_object('status', 'removed', 'promoted', v_promoted);
end;
$$;

-- The manager's list: participants with their usernames and post status
-- (profiles of other users aren't readable directly)
create or replace function public.get_campaign_participants(p_task_id uuid)
returns table (
  user_id uuid,
  username text,
  is_verified_creator boolean,
  status text,
  joined_at timestamptz,
  submission_status text,
  post_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or public.owns_campaign(p_task_id)) then
    raise exception 'Only the campaign manager can see its creators.';
  end if;

  return query
  select cp.user_id, p.username, p.is_verified_creator, cp.status, cp.joined_at, s.status, s.post_url
  from campaign_participants cp
  join profiles p on p.id = cp.user_id
  left join submissions s on s.task_id = cp.task_id and s.user_id = cp.user_id
  where cp.task_id = p_task_id
  order by
    case cp.status when 'joined' then 0 when 'standby' then 1 when 'left' then 2 else 3 end,
    cp.joined_at;
end;
$$;

-- Spots taken on each campaign, for cards and the campaign page
create or replace function public.campaign_spots(p_task_ids uuid[])
returns table (task_id uuid, joined int, standby int)
language sql
stable
security definer
set search_path = public
as $$
  select cp.task_id,
         count(*) filter (where cp.status = 'joined')::int,
         count(*) filter (where cp.status = 'standby')::int
  from campaign_participants cp
  where cp.task_id = any (p_task_ids)
  group by cp.task_id;
$$;

revoke all on function public.join_campaign(uuid) from public, anon;
revoke all on function public.leave_campaign(uuid) from public, anon;
revoke all on function public.remove_participant(uuid, uuid) from public, anon;
revoke all on function public.get_campaign_participants(uuid) from public, anon;
revoke all on function public.campaign_spots(uuid[]) from public, anon;
grant execute on function public.join_campaign(uuid) to authenticated;
grant execute on function public.leave_campaign(uuid) to authenticated;
grant execute on function public.remove_participant(uuid, uuid) to authenticated;
grant execute on function public.get_campaign_participants(uuid) to authenticated;
grant execute on function public.campaign_spots(uuid[]) to authenticated;

-- =========================================================
-- 6. Verified creators (admin) and launch notifications (server)
-- =========================================================

create or replace function public.set_creator_verified(p_user_id uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was boolean;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin access required';
  end if;

  select is_verified_creator into v_was from profiles where id = p_user_id for update;
  if not found then
    raise exception 'Creator not found.';
  end if;

  update profiles set is_verified_creator = p_verified where id = p_user_id;

  if p_verified and not v_was then
    insert into notifications (user_id, kind, title, body, link)
    values (
      p_user_id,
      'verified',
      'You''re a verified creator',
      'You can now join verified campaigns. We''ll let you know when new ones open.',
      '/discover/all?type=verified'
    );
  end if;
end;
$$;

revoke all on function public.set_creator_verified(uuid, boolean) from public, anon;
grant execute on function public.set_creator_verified(uuid, boolean) to authenticated;

-- Tell every verified creator a verified campaign is open. Runs once per
-- campaign (notified_at). Called by the server with the service role: right
-- after a campaign that starts today is created, and by the daily job.
create or replace function public.notify_verified_campaign(p_task_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_count int;
begin
  select id, title, campaign_type, status, start_date, notified_at, created_by
  into v_task
  from tasks where id = p_task_id for update;

  if not found
     or v_task.campaign_type <> 'verified'
     or v_task.status <> 'active'
     or v_task.notified_at is not null
     or (v_task.start_date is not null and v_task.start_date > public.lagos_today()) then
    return 0;
  end if;

  insert into notifications (user_id, kind, title, body, link)
  select p.id,
         'campaign_open',
         'New verified campaign: ' || v_task.title,
         'Spots are first come, first served. Join now to get yours.',
         '/discover/' || p_task_id
  from profiles p
  where p.is_verified_creator and p.id is distinct from v_task.created_by;

  get diagnostics v_count = row_count;

  update tasks set notified_at = now() where id = p_task_id;
  return v_count;
end;
$$;

revoke all on function public.notify_verified_campaign(uuid) from public, anon, authenticated;
grant execute on function public.notify_verified_campaign(uuid) to service_role;

-- =========================================================
-- 7. Approvals: per post (unchanged) or per 1,000 verified views
-- =========================================================

drop function if exists public.approve_submission(uuid, uuid);

create or replace function public.approve_submission(p_submission_id uuid, p_admin_id uuid, p_views integer default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission record;
  v_task record;
  v_amount numeric;
  v_new_count int;
  v_new_spent numeric;
  v_done boolean;
begin
  -- 1. Only real admins
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin access required';
  end if;

  -- 2. Lock the submission so it can't be paid twice
  select id, user_id, task_id, status
  into v_submission
  from submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found';
  end if;
  if v_submission.status <> 'pending' then
    raise exception 'This submission has already been processed';
  end if;

  -- 3. Lock the task so concurrent approvals can't overspend the budget
  select id, reward, max_participants, approved_count, status, pay_model, amount_paid, budget_spent
  into v_task
  from tasks
  where id = v_submission.task_id
  for update;

  if not found or v_task.reward is null then
    raise exception 'Task reward not found';
  end if;
  if v_task.status in ('suspended', 'removed') then
    raise exception 'This campaign is %. Resume it before approving posts.', v_task.status;
  end if;
  if v_task.max_participants is not null
     and v_task.approved_count >= v_task.max_participants then
    raise exception 'Campaign budget exhausted: all % spots are filled', v_task.max_participants;
  end if;

  -- 4. What this post earns
  if v_task.pay_model = 'per_1k_views' then
    if p_views is null or p_views < 0 then
      raise exception 'Enter the verified view count for this post.';
    end if;
    -- Nothing under 1,000 views; views past 5,000 aren't paid
    v_amount := case
      when p_views < 1000 then 0
      else floor(least(p_views, 5000) / 1000.0 * v_task.reward)
    end;
    -- Never past what's left of the budget
    v_amount := greatest(0, least(v_amount, coalesce(v_task.amount_paid, 0) - coalesce(v_task.budget_spent, 0)));
  else
    v_amount := v_task.reward;
  end if;

  -- 5. Approve + pay
  update submissions
  set status = 'approved',
      paid_at = now(),
      verified_views = p_views,
      payout_amount = v_amount
  where id = p_submission_id;

  if v_amount > 0 then
    update profiles
    set balance = coalesce(balance, 0) + v_amount
    where id = v_submission.user_id;
  end if;

  -- 6. Draw down the campaign; complete it when spots or budget run out
  v_new_count := v_task.approved_count + 1;
  v_new_spent := coalesce(v_task.budget_spent, 0) + v_amount;
  v_done := (v_task.max_participants is not null and v_new_count >= v_task.max_participants)
         or (v_task.pay_model = 'per_1k_views' and v_task.amount_paid is not null and v_new_spent >= v_task.amount_paid);

  update tasks
  set approved_count = v_new_count,
      budget_spent = v_new_spent,
      status = case when v_done then 'completed' else status end
  where id = v_task.id;

  return json_build_object(
    'success', true,
    'submission_id', p_submission_id,
    'user_id', v_submission.user_id,
    'amount', v_amount,
    'views', p_views,
    'approved_count', v_new_count,
    'max_participants', v_task.max_participants
  );
end;
$$;

revoke execute on function public.approve_submission(uuid, uuid, integer) from public, anon;
grant execute on function public.approve_submission(uuid, uuid, integer) to authenticated;
