-- Where a campaign's customers are, starting from our cities (campaign
-- creation plan, screen 5, 26 Nov 2026). The builder now offers Uyo, Ikot
-- Ekpene, anywhere in Akwa Ibom, anywhere in Nigeria, or another Nigerian
-- city or state, instead of Country → Zone → State. target_state,
-- target_zone and target_country are still filled in (from the city's
-- state); target_city is null when the campaign covers a whole state or
-- the whole country. The allowed cities are checked by the server
-- (src/lib/campaignPlaces.ts), so the list can grow without a migration.

alter table public.tasks
  add column if not exists target_city text;

alter table public.tasks
  drop constraint if exists tasks_target_city_length;
alter table public.tasks
  add constraint tasks_target_city_length check (target_city is null or char_length(target_city) between 1 and 60);

comment on column public.tasks.target_city is
  'City the campaign is for (e.g. Uyo). Null = the whole target_state, or anywhere when target_state is All.';
