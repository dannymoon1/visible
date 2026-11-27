# Captcha on sign-up: Cloudflare Turnstile (set-up)

Tier 1, item 4 of the creator-launch build. Turnstile stops bot sign-ups. Most
people never see it; it shows a single tap only when Cloudflare is unsure.

The code is done (`src/components/auth/Turnstile.tsx`). It sits on sign-up,
sign-in and "Send a new code", because once captcha is on, Supabase checks all
three. Without a site key the widget doesn't render and nothing is checked.

**Do the steps in this order.** If captcha is switched on in Supabase before the
site key is live on the site, nobody can sign up or sign in.

## 1. Cloudflare: make the widget

1. dash.cloudflare.com (a free account is enough; the domain doesn't need to be
   on Cloudflare) → Turnstile → **Add widget**.
2. Name `Visibility Campaigns`. Hostnames: `visibilitycampaigns.com`,
   `www.visibilitycampaigns.com`, `localhost`, and the Vercel preview host if
   you test there.
3. Widget mode **Managed**. Pre-clearance: No.
4. Copy the **Site key** (public) and the **Secret key** (private).

## 2. The site: add the site key

In Vercel → Project → Settings → Environment Variables, add
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` = the site key, for Production and Preview.
Add it to your local `.env` too. Redeploy (the value is built into the page).

Check: open `/register` on the live site. It should work as before, and a
request to `challenges.cloudflare.com` appears in the browser's network tab.

## 3. Supabase: switch captcha on

Dashboard → Authentication → **Attack Protection** → Enable Captcha protection
→ provider **Turnstile by Cloudflare** → paste the **Secret key** → Save.

## 4. Check it works

1. Sign up with a new email: you reach "Check your inbox" as usual.
2. Sign out, sign in: it works.
3. On the inbox step, wait out the timer and tap **Send a new code**: a new
   email arrives.

If any of these fails with "captcha verification process failed", the site key
and secret are from different widgets, or the site wasn't redeployed after
step 2. Switch captcha off in Supabase (step 3) while you fix it, so people can
still get in.

## Testing without real keys

Cloudflare's test site key `1x00000000000000000000AA` always passes and makes a
dummy token. Supabase must have captcha **off** while you use it, because the
dummy token fails a real secret.
