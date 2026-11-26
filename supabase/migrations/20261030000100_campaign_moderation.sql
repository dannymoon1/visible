-- Admins can suspend, resume or remove campaigns.
--
--   suspended: hidden from creators, no new posts, no approvals; can resume
--   removed:   permanent takedown; pending submissions are rejected
--
-- Nothing is deleted, so payments, payouts and earnings history stay intact.

-- 1. New statuses + who/why/when
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status in ('active', 'completed', 'suspended', 'removed'));

alter table public.tasks
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users (id);

-- 2. Creators only see live campaigns, plus ones they already posted for
--    (so their submission history keeps its titles). Admins see everything.
drop policy if exists "Enable read access for all users" on public.tasks;
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
  );

-- 3. No new submissions for campaigns that aren't live
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
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.status = 'active'
    )
  );

-- 4. The admin action
create or replace function public.set_campaign_status(p_task_id uuid, p_action text, p_reason text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_new_status text;
  v_rejected int := 0;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin access required';
  end if;

  select id, status, max_participants, approved_count into v_task
  from tasks where id = p_task_id for update;

  if not found then
    raise exception 'Campaign not found';
  end if;

  if p_action = 'suspend' then
    if v_task.status <> 'active' then
      raise exception 'Only active campaigns can be suspended (this one is %).', v_task.status;
    end if;
    v_new_status := 'suspended';

  elsif p_action = 'resume' then
    if v_task.status <> 'suspended' then
      raise exception 'Only suspended campaigns can be resumed (this one is %).', v_task.status;
    end if;
    -- Back to completed if every spot was already filled
    v_new_status := case
      when v_task.max_participants is not null and v_task.approved_count >= v_task.max_participants
        then 'completed'
      else 'active'
    end;

  elsif p_action = 'remove' then
    if v_task.status = 'removed' then
      raise exception 'This campaign has already been removed.';
    end if;
    if nullif(trim(coalesce(p_reason, '')), '') is null then
      raise exception 'Give a reason for removing this campaign.';
    end if;
    v_new_status := 'removed';

    -- Nobody can be paid for a removed campaign, so close its queue
    update submissions
    set status = 'rejected',
        verification_summary = trim(coalesce(verification_summary, '') || ' Campaign removed by admin.')
    where task_id = p_task_id and status = 'pending';
    get diagnostics v_rejected = row_count;

  else
    raise exception 'Unknown action: %', p_action;
  end if;

  update tasks
  set status = v_new_status,
      moderation_reason = case when p_action = 'resume' then null else nullif(trim(p_reason), '') end,
      moderated_at = now(),
      moderated_by = auth.uid()
  where id = p_task_id;

  return json_build_object('status', v_new_status, 'rejected_submissions', v_rejected);
end;
$$;

revoke all on function public.set_campaign_status(uuid, text, text) from public, anon;
grant execute on function public.set_campaign_status(uuid, text, text) to authenticated;

-- 5. Approvals: refuse campaigns that are suspended or removed
create or replace function public.approve_submission(p_submission_id uuid, p_admin_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission record;
  v_task record;
  v_new_count int;
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
  select id, reward, max_participants, approved_count, status
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

  -- 4. Approve + pay
  update submissions
  set status = 'approved', paid_at = now()
  where id = p_submission_id;

  update profiles
  set balance = coalesce(balance, 0) + v_task.reward
  where id = v_submission.user_id;

  -- 5. Draw down the campaign budget
  v_new_count := v_task.approved_count + 1;

  update tasks
  set approved_count = v_new_count,
      budget_spent = budget_spent + v_task.reward,
      status = case
        when max_participants is not null and v_new_count >= max_participants then 'completed'
        else status
      end
  where id = v_task.id;

  return json_build_object(
    'success', true,
    'submission_id', p_submission_id,
    'user_id', v_submission.user_id,
    'amount', v_task.reward,
    'approved_count', v_new_count,
    'max_participants', v_task.max_participants
  );
end;
$$;

revoke execute on function public.approve_submission(uuid, uuid) from public, anon;
grant execute on function public.approve_submission(uuid, uuid) to authenticated;
