-- Visible now pays users for making their own posts about a campaign
-- (instead of commenting on someone else's post). A submission's proof
-- is the link to the user's post; comment_text now holds the post's text.

alter table public.submissions
  add column if not exists post_url text,
  add column if not exists post_platform text;
