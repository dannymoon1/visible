-- Campaign budgets: reward per approval = amount_paid / max_participants.
-- Each approval draws down the budget; the campaign completes when it's used up.
-- Tasks created before this (max_participants is null) keep working uncapped.

alter table public.tasks
  add column if not exists max_participants int check (max_participants is null or max_participants > 0),
  add column if not exists approved_count int not null default 0,
  add column if not exists budget_spent numeric not null default 0,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'completed'));

-- Backfill counters for existing tasks from already-approved submissions
update public.tasks t
set approved_count = s.cnt,
    budget_spent = s.cnt * coalesce(t.reward, 0)
from (
  select task_id, count(*)::int as cnt
  from public.submissions
  where status = 'approved'
  group by task_id
) s
where s.task_id = t.id;

-- Approve a submission, pay the user, and draw down the campaign budget.
-- SECURITY FIX: the admin check now uses the signed-in user (auth.uid())
-- instead of trusting the p_admin_id argument sent from the browser.
-- p_admin_id is kept only so existing callers don't break.
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
  if not exists (
    select 1 from profiles where id = auth.uid() and is_admin = true
  ) then
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
