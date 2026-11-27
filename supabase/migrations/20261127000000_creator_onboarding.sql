-- Creator onboarding (tier 1 of the creator-launch build, 2026-11-27).
--
-- After confirming their email, a creator gives a handle, a city and the
-- platforms they post on, each with a link to their profile. Admins read it in
-- /admin/creators to verify creators by hand and pick who joins verified
-- campaigns. Per-platform verification (CLAUDE.md → Verification) will hang
-- its status off creator_platforms later.
--
-- The handle is profiles.username. Rules match src/lib/creatorProfile.ts.

-- ---------------------------------------------------------------
-- 1. Profile: city and when onboarding was finished
-- ---------------------------------------------------------------
alter table public.profiles
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists onboarded_at timestamptz;

-- One account per handle, whatever the capitals
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

-- ---------------------------------------------------------------
-- 2. The platforms a creator posts on, one row each
-- ---------------------------------------------------------------
create table if not exists public.creator_platforms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('Facebook', 'Instagram', 'TikTok', 'YouTube')),
  profile_url text not null check (profile_url ~ '^https://' and length(profile_url) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform)
);

alter table public.creator_platforms enable row level security;

-- Read: your own, or everyone's for admins. Writes only through
-- save_creator_onboarding() below.
revoke all on public.creator_platforms from anon, authenticated;
grant select on public.creator_platforms to authenticated;

drop policy if exists "Creators see own platforms" on public.creator_platforms;
create policy "Creators see own platforms" on public.creator_platforms
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------
-- 3. Saving onboarding: handle, city and platforms in one go
--    p_platforms: [{"platform": "TikTok", "url": "https://www.tiktok.com/@ada"}, ...]
-- ---------------------------------------------------------------
create or replace function public.save_creator_onboarding(
  p_handle text,
  p_city text,
  p_state text,
  p_platforms jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_handle text := lower(regexp_replace(trim(coalesce(p_handle, '')), '^@', ''));
  v_city text := nullif(trim(coalesce(p_city, '')), '');
  v_state text := nullif(trim(coalesce(p_state, '')), '');
  v_item jsonb;
  v_platform text;
  v_url text;
  v_seen text[] := '{}';
begin
  if v_uid is null then
    raise exception 'Sign in first';
  end if;

  if v_handle !~ '^[a-z0-9._]{3,30}$' then
    raise exception 'Your handle needs 3 to 30 letters, numbers, dots or underscores';
  end if;
  if exists (select 1 from profiles where lower(username) = v_handle and id <> v_uid) then
    raise exception 'That handle is taken. Try another';
  end if;

  if v_city is null or length(v_city) > 60 then
    raise exception 'Choose your city';
  end if;
  if v_state is not null and length(v_state) > 60 then
    raise exception 'Choose your state';
  end if;

  if jsonb_typeof(p_platforms) <> 'array' or jsonb_array_length(p_platforms) = 0 then
    raise exception 'Add at least one platform you post on';
  end if;

  for v_item in select * from jsonb_array_elements(p_platforms) loop
    v_platform := v_item ->> 'platform';
    v_url := trim(coalesce(v_item ->> 'url', ''));

    if v_platform not in ('Facebook', 'Instagram', 'TikTok', 'YouTube') or v_platform = any (v_seen) then
      raise exception 'Unknown or repeated platform: %', coalesce(v_platform, '(none)');
    end if;
    v_seen := v_seen || v_platform;

    if length(v_url) > 300 or not (
      (v_platform = 'Facebook' and v_url ~* '^https://(www\.|m\.|web\.)?(facebook|fb)\.com/.+')
      or (v_platform = 'Instagram' and v_url ~* '^https://(www\.)?instagram\.com/.+')
      or (v_platform = 'TikTok' and v_url ~* '^https://(www\.|m\.|vm\.|vt\.)?tiktok\.com/.+')
      or (v_platform = 'YouTube' and v_url ~* '^https://((www\.|m\.)?youtube\.com|youtu\.be)/.+')
    ) then
      raise exception 'Check your % profile link', v_platform;
    end if;

    insert into creator_platforms (user_id, platform, profile_url)
    values (v_uid, v_platform, v_url)
    on conflict (user_id, platform)
      do update set profile_url = excluded.profile_url, updated_at = now()
      where creator_platforms.profile_url is distinct from excluded.profile_url;
  end loop;

  delete from creator_platforms where user_id = v_uid and not (platform = any (v_seen));

  update profiles
  set username = v_handle,
      city = v_city,
      state = v_state,
      onboarded_at = coalesce(onboarded_at, now())
  where id = v_uid;
end;
$$;

revoke all on function public.save_creator_onboarding(text, text, text, jsonb) from public, anon;
grant execute on function public.save_creator_onboarding(text, text, text, jsonb) to authenticated;
