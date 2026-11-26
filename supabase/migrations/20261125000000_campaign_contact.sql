-- How customers reach the business (campaign creation plan, screen 4).
-- Creators put it in their posts; later each creator gets a tracked link to
-- it, which is how we count clicks and WhatsApp chats. The builder and the
-- server clean the value first (src/lib/campaignContact.ts):
--   whatsapp  +2348012345678
--   social    https://instagram.com/yourshop
--   website   https://yourshop.com
--   address   12 Aka Road, Uyo
-- Campaigns made before this have neither.

alter table public.tasks
  add column if not exists contact_type text,
  add column if not exists contact_value text;

alter table public.tasks drop constraint if exists tasks_contact_check;
alter table public.tasks add constraint tasks_contact_check check (
  (contact_type is null and contact_value is null)
  or (
    contact_type in ('whatsapp', 'social', 'website', 'address')
    and char_length(contact_value) between 3 and 300
    and (contact_type <> 'whatsapp' or contact_value ~ '^\+234[789][01][0-9]{8}$')
  )
);

comment on column public.tasks.contact_type is 'How customers reach the business: whatsapp, social, website or address';
comment on column public.tasks.contact_value is 'The cleaned contact: +234 number, https link or street address';
