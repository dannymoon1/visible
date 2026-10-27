-- Proof + verification results for submissions.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.submissions
  -- Proof the user provides when submitting a task
  add column if not exists social_handle text,
  add column if not exists comment_text text,

  -- Written by the verification agent
  add column if not exists verification_verdict text
    check (verification_verdict in ('pass', 'review', 'fail')),
  add column if not exists engagement_status text
    check (engagement_status in ('found', 'not_found', 'unverifiable', 'error')),
  add column if not exists quality_score int,
  add column if not exists verification_flags jsonb default '[]'::jsonb,
  add column if not exists verification_summary text,
  add column if not exists verified_at timestamptz;
