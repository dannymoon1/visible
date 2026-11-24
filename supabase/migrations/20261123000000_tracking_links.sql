-- Tracking links (decided 2026-11-23)
--
-- Admins create a link for every place we post (a WhatsApp group, a flyer, an
-- agent): visibilitycampaigns.com/r/<slug>. The slug is a short code made for
-- us (k7m2q) or a custom word for print (uniuyo). It never changes once made,
-- because it's already out in group chats and on paper; the label can.
--
-- What we record, per link and per person (a random visitor id on the phone,
-- no IP address, no personal details before sign-up):
--   click        opened the link (preview bots are filtered out by the app)
--   engaged      stayed 15 seconds, scrolled halfway or used a form
--   cta_click    tapped a sign-up or start-campaign button
--   signup_view  opened the sign-up page
--   builder_view opened the campaign builder
--   signed_up    created an account (also saved on profiles.signup_link_id)
-- Each step is stored once per person per link, so refreshing doesn't
-- double-count; hits keeps the raw number of opens.
--
-- After sign-up, the steps come from real records: campaigns joined, posts
-- submitted and approved, campaigns paid for. See link_stats().

-- ---------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------
create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 20),
  label text not null check (char_length(trim(label)) between 1 and 80),
  channel text not null
    check (channel in ('whatsapp', 'facebook', 'instagram', 'tiktok', 'youtube', 'x', 'telegram', 'linkedin', 'email', 'flyer', 'agent', 'other')),
  audience text not null check (audience in ('creators', 'businesses')),
  message text not null default '' check (char_length(message) <= 500),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.link_events (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.tracking_links (id) on delete cascade,
  visitor_id uuid not null,
  event text not null
    check (event in ('click', 'engaged', 'cta_click', 'signup_view', 'builder_view', 'signed_up')),
  user_id uuid references auth.users (id) on delete set null,
  device text check (device in ('mobile', 'desktop')),
  hits integer not null default 1,
  created_at timestamptz not null default now(),
  unique (link_id, visitor_id, event)
);

create index if not exists link_events_link_event on public.link_events (link_id, event, created_at);

alter table public.profiles
  add column if not exists signup_link_id uuid references public.tracking_links (id) on delete set null;

create index if not exists profiles_signup_link on public.profiles (signup_link_id) where signup_link_id is not null;

-- ---------------------------------------------------------------
-- 2. Access: admins only. Events are written through
--    record_link_event() below, never directly.
-- ---------------------------------------------------------------
alter table public.tracking_links enable row level security;
alter table public.link_events enable row level security;

revoke all on public.tracking_links from anon, authenticated;
revoke all on public.link_events from anon, authenticated;

grant select, insert on public.tracking_links to authenticated;
-- The slug can never be edited; only these columns can
grant update (label, channel, message, archived_at) on public.tracking_links to authenticated;
grant select on public.link_events to authenticated;

drop policy if exists "Admins read links" on public.tracking_links;
create policy "Admins read links" on public.tracking_links
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins create links" on public.tracking_links;
create policy "Admins create links" on public.tracking_links
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins edit links" on public.tracking_links;
create policy "Admins edit links" on public.tracking_links
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins read link events" on public.link_events;
create policy "Admins read link events" on public.link_events
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------
-- 3. Recording a step. Called by /r/[slug] and /api/track for any
--    visitor, so it only accepts the six known steps on an existing
--    link. Archived links keep working: they may be on printed flyers.
--    Returns the link's audience, or null when the slug doesn't exist.
-- ---------------------------------------------------------------
create or replace function public.record_link_event(
  p_slug text,
  p_visitor uuid,
  p_event text,
  p_device text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.tracking_links%rowtype;
begin
  if p_visitor is null
     or p_event not in ('click', 'engaged', 'cta_click', 'signup_view', 'builder_view') then
    return null;
  end if;

  select * into v_link from public.tracking_links where slug = lower(trim(p_slug));
  if not found then
    return null;
  end if;

  insert into public.link_events (link_id, visitor_id, event, device)
  values (
    v_link.id,
    p_visitor,
    p_event,
    case when p_device in ('mobile', 'desktop') then p_device end
  )
  on conflict (link_id, visitor_id, event)
  do update set hits = public.link_events.hits + 1;

  return v_link.audience;
end;
$$;

revoke all on function public.record_link_event(text, uuid, text, text) from public;
grant execute on function public.record_link_event(text, uuid, text, text) to anon, authenticated;

-- ---------------------------------------------------------------
-- 4. Crediting a sign-up. The register page passes the link and the
--    visitor id in the sign-up metadata (signup_ref, signup_visitor).
--    This runs when the profile row is created, whatever creates it,
--    and never blocks a sign-up.
-- ---------------------------------------------------------------
create or replace function public.attribute_signup_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb;
  v_slug text;
  v_link uuid;
  v_visitor uuid;
begin
  if new.signup_link_id is not null then
    return new;
  end if;

  select raw_user_meta_data into v_meta from auth.users where id = new.id;
  v_slug := lower(nullif(trim(v_meta ->> 'signup_ref'), ''));
  if v_slug is null then
    return new;
  end if;

  select id into v_link from public.tracking_links where slug = v_slug;
  if v_link is null then
    return new;
  end if;

  new.signup_link_id := v_link;

  begin
    v_visitor := (v_meta ->> 'signup_visitor')::uuid;
  exception when others then
    v_visitor := null;
  end;

  if v_visitor is not null then
    insert into public.link_events (link_id, visitor_id, event, user_id)
    values (v_link, v_visitor, 'signed_up', new.id)
    on conflict (link_id, visitor_id, event) do nothing;
  end if;

  return new;
exception when others then
  return new;
end;
$$;

revoke all on function public.attribute_signup_link() from public, anon, authenticated;

drop trigger if exists profiles_attribute_signup_link on public.profiles;
create trigger profiles_attribute_signup_link
  before insert on public.profiles
  for each row execute function public.attribute_signup_link();

-- ---------------------------------------------------------------
-- 5. Numbers for the admin pages.
--    p_since limits opens and sign-ups to a period (null = all time);
--    what those sign-ups did next is counted whenever it happened.
-- ---------------------------------------------------------------
create or replace function public.link_stats(p_since timestamptz default null)
returns table (
  link_id uuid,
  opened bigint,
  opens_total bigint,
  stayed bigint,
  cta_clicks bigint,
  signup_views bigint,
  builder_views bigint,
  signed_up bigint,
  joined_campaign bigint,
  posted bigint,
  approved bigint,
  paid_campaign bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin access required';
  end if;

  return query
  with ev as (
    select e.link_id, e.visitor_id, e.event, e.hits
    from public.link_events e
    where p_since is null or e.created_at >= p_since
  ),
  su as (
    select p.id, p.signup_link_id
    from public.profiles p
    where p.signup_link_id is not null
      and (p_since is null or p.created_at >= p_since)
  )
  select
    l.id,
    (select count(*) from ev where ev.link_id = l.id and ev.event = 'click'),
    (select coalesce(sum(ev.hits), 0)::bigint from ev where ev.link_id = l.id and ev.event = 'click'),
    (select count(distinct ev.visitor_id) from ev
      where ev.link_id = l.id and ev.event in ('engaged', 'cta_click', 'signed_up')),
    (select count(*) from ev where ev.link_id = l.id and ev.event = 'cta_click'),
    (select count(*) from ev where ev.link_id = l.id and ev.event = 'signup_view'),
    (select count(*) from ev where ev.link_id = l.id and ev.event = 'builder_view'),
    (select count(*) from su where su.signup_link_id = l.id),
    (select count(*) from su where su.signup_link_id = l.id
      and exists (select 1 from public.campaign_participants cp
                  where cp.user_id = su.id and cp.status in ('joined', 'standby', 'left'))),
    (select count(*) from su where su.signup_link_id = l.id
      and exists (select 1 from public.submissions s where s.user_id = su.id)),
    (select count(*) from su where su.signup_link_id = l.id
      and exists (select 1 from public.submissions s
                  where s.user_id = su.id and s.status in ('approved', 'paid'))),
    (select count(*) from su where su.signup_link_id = l.id
      and exists (select 1 from public.tasks t
                  where t.created_by = su.id and coalesce(t.amount_paid, 0) > 0))
  from public.tracking_links l;
end;
$$;

revoke all on function public.link_stats(timestamptz) from public, anon;
grant execute on function public.link_stats(timestamptz) to authenticated;

-- Everyone who signed up through one link, and how far each has got
create or replace function public.link_signups(p_link_id uuid)
returns table (
  user_id uuid,
  username text,
  email text,
  created_at timestamptz,
  campaigns_joined bigint,
  posts bigint,
  approved_posts bigint,
  campaigns_paid bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: Admin access required';
  end if;

  return query
  select
    p.id,
    p.username,
    p.email,
    p.created_at::timestamptz,
    (select count(*) from public.campaign_participants cp
      where cp.user_id = p.id and cp.status in ('joined', 'standby', 'left')),
    (select count(*) from public.submissions s where s.user_id = p.id),
    (select count(*) from public.submissions s
      where s.user_id = p.id and s.status in ('approved', 'paid')),
    (select count(*) from public.tasks t
      where t.created_by = p.id and coalesce(t.amount_paid, 0) > 0)
  from public.profiles p
  where p.signup_link_id = p_link_id
  order by p.created_at desc;
end;
$$;

revoke all on function public.link_signups(uuid) from public, anon;
grant execute on function public.link_signups(uuid) to authenticated;
