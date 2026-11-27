# Auth emails through Resend (set-up)

Tier 1, item 1 of the creator-launch build (Launch & Adoption Plan). Supabase's
built-in mailer sends only a few emails an hour and is meant for testing, so 50
sign-ups in a day would lock people out. Every Supabase Auth email (sign-up code,
and later password reset and email change) goes through Resend instead, from
**visibilitycampaigns.online**.

The code side is done: the email template is `supabase/templates/confirm-signup.html`
and its button lands on `src/app/auth/confirm/route.ts`. The steps below are
dashboard and DNS work that needs the founder's accounts. Do them in order, on
the development project first (`rlxvzrxfxtltuoowijra`), then on production when
it exists.

## 1. Resend: verify the domain

1. resend.com → Domains → Add domain → `visibilitycampaigns.online`, region
   **Ireland (eu-west-1)** to sit next to the Supabase project.
2. Add the records Resend shows at the domain's DNS host, exactly as given:
   - an **MX** and a **TXT (SPF)** record on the `send` subdomain
   - a **TXT (DKIM)** record at `resend._domainkey`
3. Also add a DMARC record so Gmail trusts the mail:
   `TXT` at `_dmarc` → `v=DMARC1; p=none; rua=mailto:dmarc@visibilitycampaigns.online`
   (start with `p=none`; tighten to `quarantine` after a few clean weeks).
4. Wait until Resend shows the domain as **Verified** (minutes to a few hours).

## 2. Resend: make an API key for Supabase

API Keys → Create → name `supabase-auth`, permission **Sending access**, domain
`visibilitycampaigns.online`. Copy it; it's shown once. Don't put it in the repo.

## 3. Supabase: switch Auth to Resend's SMTP

Dashboard → Authentication → Emails → **SMTP Settings** → Enable custom SMTP:

| Field | Value |
| --- | --- |
| Sender email | `no-reply@visibilitycampaigns.online` |
| Sender name | `Visibility Campaigns` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the API key from step 2 |
| Minimum interval between emails | `60` seconds (the sign-up screen's resend button waits the same) |

## 4. Supabase: the sign-up email

Authentication → Emails → Templates → **Confirm sign up**:

- Subject: `Your Visibility Campaigns code: {{ .Token }}`
- Body: paste all of `supabase/templates/confirm-signup.html`.

The email carries an 8-digit code (typed on the sign-up screen) and a button for
anyone who opens it on another device.

Authentication → Providers → Email: keep **Confirm email** on, and set **Email
OTP length** at `8` (the sign-up screen expects 8 digits, `CODE_LENGTH` in
`src/lib/pendingSignup.ts`; change both together) and **Email OTP expiration** to `3600` seconds.

## 5. Supabase: addresses and limits

- Authentication → URL Configuration → **Site URL**: `https://visibilitycampaigns.com`
  (the email button uses it). Redirect URLs: add `http://localhost:3000/**` and
  `https://visibilitycampaigns.com/**`.
- Authentication → Rate Limits → **Rate limit for sending emails**: raise from
  the default 30 an hour to at least `150`.

## 6. Check it works

1. Sign up at `/register` with a real inbox you can open.
2. The email arrives from `no-reply@visibilitycampaigns.online` within a minute,
   not in spam, with the code in the subject.
3. Type the code: you land on `/welcome`, signed in.
4. Sign up again with another inbox and use the button instead, on a different
   phone: it opens `/welcome` signed in there.

## Limits to watch

- **Resend's free plan sends 100 emails a day and 3,000 a month.** Every sign-up
  is at least one email, and resends count. If a launch day could bring more than
  about 70 sign-ups, move to Resend Pro (about $20 a month for 50,000 emails)
  before posting links.
- The same Resend account can send the app's own notifications
  (`src/lib/notify.ts`): set `RESEND_API_KEY` and
  `RESEND_FROM="Visibility Campaigns <no-reply@visibilitycampaigns.online>"`
  in Vercel. Use a separate API key from the Supabase one so either can be
  revoked alone.
