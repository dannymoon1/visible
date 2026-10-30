-- Campaign details for the order page.
-- Additive only: every new column is nullable, so existing tasks keep working.

alter table public.tasks
  add column if not exists content_type text,
  add column if not exists content_details text,
  add column if not exists platforms text[] not null default '{}',
  add column if not exists target_country text,
  add column if not exists target_zone text,
  add column if not exists target_state text,
  add column if not exists languages text[] not null default '{}',
  add column if not exists reference_links text[] not null default '{}',
  add column if not exists start_date date,
  add column if not exists banner_url text,
  add column if not exists created_by uuid references auth.users (id),
  add column if not exists amount_paid numeric,
  add column if not exists payment_reference text;

-- Public bucket for campaign banners (images up to 5 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-banners',
  'campaign-banners',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Signed-in users can upload only into their own folder: <user id>/<file>
drop policy if exists "Users upload own campaign banners" on storage.objects;
create policy "Users upload own campaign banners"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'campaign-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can view banners (they're shown on public task cards)
drop policy if exists "Campaign banners are public" on storage.objects;
create policy "Campaign banners are public"
  on storage.objects for select
  using (bucket_id = 'campaign-banners');
