-- Campaign review (decided 2026-11-19): a paid campaign is not shown to
-- creators until an admin has checked it. The admin can correct or add to the
-- brief and details, then approve it (it goes live) or reject it (it stays
-- hidden and the business is refunded by hand through Paystack).
--
--   pending_review: paid, waiting for an admin. Only the business and admins see it.
--   rejected:       not approved. Hidden, with the reason shown to the business.
--
-- Pay (rate, posts/creators, budget) is never edited here: it is what the
-- business paid for.

-- 1. Statuses. New campaigns start in review.
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status in ('pending_review', 'active', 'completed', 'suspended', 'rejected', 'removed'));

alter table public.tasks alter column status set default 'pending_review';

alter table public.tasks
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users (id),
  add column if not exists review_note text;

create index if not exists tasks_pending_review on public.tasks (created_at) where status = 'pending_review';

-- The read policy (20261118) already limits creators to active and completed
-- campaigns; the business (created_by) and admins see the rest. join_campaign
-- and the submission policy both require status = 'active'. Nothing else to
-- change for hiding.

-- 2. Admin edits: corrections and additions to what creators will read.
create or replace function public.admin_update_campaign(
  p_task_id uuid,
  p_title text,
  p_description text,
  p_platforms text[],
  p_languages text[],
  p_reference_links text[],
  p_banner_url text,
  p_start_date date,
  p_target_country text,
  p_target_zone text,
  p_target_state text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_title text := trim(coalesce(p_title, ''));
  v_description text := trim(coalesce(p_description, ''));
  v_platforms text[] := coalesce(p_platforms, '{}');
  v_languages text[] := coalesce(p_languages, '{}');
  v_links text[];
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin access required';
  end if;

  select status into v_status from tasks where id = p_task_id for update;
  if not found then
    raise exception 'Campaign not found';
  end if;
  if v_status in ('removed', 'rejected', 'completed') then
    raise exception 'A % campaign can''t be edited.', v_status;
  end if;

  if v_title = '' or char_length(v_title) > 80 then
    raise exception 'The campaign name must be 1 to 80 characters.';
  end if;
  if v_description = '' or char_length(v_description) > 500 then
    raise exception 'The brief must be 1 to 500 characters.';
  end if;
  if cardinality(v_platforms) = 0
     or not v_platforms <@ array['Facebook', 'Instagram', 'TikTok', 'YouTube Shorts', 'YouTube'] then
    raise exception 'Choose at least one of Facebook, Instagram, TikTok, YouTube Shorts or YouTube.';
  end if;
  if cardinality(v_languages) = 0 then
    raise exception 'Choose at least one language.';
  end if;

  select coalesce(array_agg(l), '{}') into v_links
  from (select trim(x) as l from unnest(coalesce(p_reference_links, '{}')) x) s
  where l <> '';
  if cardinality(v_links) > 3 then
    raise exception 'Add at most 3 reference links.';
  end if;
  if exists (select 1 from unnest(v_links) l where l !~* '^https?://') then
    raise exception 'Reference links must start with http:// or https://';
  end if;
  if nullif(trim(p_banner_url), '') is not null and trim(p_banner_url) !~* '^https://' then
    raise exception 'The banner must be an https:// image link.';
  end if;
  if p_start_date is null then
    raise exception 'Choose a start date.';
  end if;

  update tasks
  set title = v_title,
      description = v_description,
      platforms = v_platforms,
      platform = array_to_string(v_platforms, ', '),
      languages = v_languages,
      reference_links = v_links,
      banner_url = nullif(trim(p_banner_url), ''),
      start_date = p_start_date,
      target_country = nullif(trim(p_target_country), ''),
      target_zone = nullif(trim(p_target_zone), ''),
      target_state = nullif(trim(p_target_state), '')
  where id = p_task_id;
end;
$$;

revoke all on function public.admin_update_campaign(uuid, text, text, text[], text[], text[], text, date, text, text, text) from public, anon;
grant execute on function public.admin_update_campaign(uuid, text, text, text[], text[], text[], text, date, text, text, text) to authenticated;

-- 3. The decision. Approve: live (and verified creators are told if it has
--    started). Reject: hidden, reason required. The business is notified
--    either way.
create or replace function public.review_campaign(p_task_id uuid, p_action text, p_note text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_today date := public.lagos_today();
  v_start date;
  v_notified int := 0;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin access required';
  end if;

  select id, title, status, campaign_type, start_date, created_by into v_task
  from tasks where id = p_task_id for update;
  if not found then
    raise exception 'Campaign not found';
  end if;
  if v_task.status <> 'pending_review' then
    raise exception 'This campaign has already been reviewed (it is %).', v_task.status;
  end if;

  if p_action = 'approve' then
    -- A start date that passed while it waited becomes today
    v_start := greatest(coalesce(v_task.start_date, v_today), v_today);

    update tasks
    set status = 'active',
        start_date = v_start,
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        review_note = v_note
    where id = p_task_id;

    if v_task.created_by is not null then
      insert into notifications (user_id, kind, title, body, link)
      values (
        v_task.created_by,
        'campaign_approved',
        case when v_start > v_today
          then 'Approved: ' || v_task.title || ' goes live on ' || to_char(v_start, 'FMDD Mon')
          else 'Your campaign is live: ' || v_task.title
        end,
        coalesce('Note from our team: ' || v_note, 'Creators can now find it on Discover.'),
        '/order/' || p_task_id
      );
    end if;

    -- Verified campaigns that have started: tell verified creators now.
    -- Later starts are picked up by the daily job.
    if v_task.campaign_type = 'verified' then
      v_notified := public.notify_verified_campaign(p_task_id);
    end if;

    return json_build_object('status', 'active', 'start_date', v_start, 'notified', v_notified);

  elsif p_action = 'reject' then
    if v_note is null then
      raise exception 'Give the business a reason.';
    end if;

    update tasks
    set status = 'rejected',
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        review_note = v_note
    where id = p_task_id;

    if v_task.created_by is not null then
      insert into notifications (user_id, kind, title, body, link)
      values (
        v_task.created_by,
        'campaign_rejected',
        'Not approved: ' || v_task.title,
        v_note || ' Your payment will be refunded.',
        '/order/' || p_task_id
      );
    end if;

    return json_build_object('status', 'rejected', 'notified', 0);
  else
    raise exception 'Unknown action: %', p_action;
  end if;
end;
$$;

revoke all on function public.review_campaign(uuid, text, text) from public, anon;
grant execute on function public.review_campaign(uuid, text, text) to authenticated;
