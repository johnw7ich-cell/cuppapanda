# Cuppa Panda — Cloudflare + Supabase stack (migration steps)

Architecture (decided 2026-10-22): GitHub (code) → Cloudflare Pages (hosting + API
functions) → Supabase (products / orders / subscribers) → gateway hosted checkout
(provider chosen when the merchant entity is decided) → Resend (email, later step).
GitHub Pages stays as the preview until the Cloudflare deploy is verified.

## What is in this repo now (Step 1 — done by Edison)

- The live site, unchanged (`index.html`, `catalog.html`, `images/`)
- `supabase/schema.sql` — products, orders, order_items, subscribers,
  webhook_events, support_tickets. RLS on; only active products are public.
- `supabase/seed.sql` — the 17 products with USD base prices extracted from the
  site and cross-checked against the AW2026 catalog. Pricing rule (server-side):
  `floor(usd_base × rate) + 0.99`, GBP 0.75 / EUR 0.86 / USD 1.
- `functions/api/` — Cloudflare Pages Functions:
  - `checkout.js` — validates the cart against Supabase prices, creates a
    `pending` order, returns an order number. Payment mode is `email` until a
    gateway is connected (same as the current site behaviour).
  - `subscribe.js` — Panda Club signup stored in Supabase (returns PANDA15).
  - `order-status.js` — order lookup requiring order number + email.
  - `faq.js` — approved FAQ answers for the bot (rule-based, $0 to run).
- `_headers` — basic security/cache headers for Cloudflare Pages.

## Step 2 — connect the accounts (needs Joh, ~5 minutes total)

Edison cannot hold these keys in chat. Either Joh does the clicks, or Edison
drives the browser while Joh approves sign-ins / enters keys on secure pages.

1. **Supabase** (org "joy" already created): New Project → name `cuppapanda` →
   SQL Editor → run `supabase/schema.sql`, then `supabase/seed.sql` →
   Project Settings → API: note the Project URL and the `service_role` key.
2. **Cloudflare**: Pages → Create → Connect to Git → repo `johnw7ich-cell/cuppapanda`,
   production branch `main`, build command: *(none)*, output directory: `/`.
   Then Settings → Environment variables (Production):
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from step 1).
3. Deploy. The site appears at `cuppapanda.pages.dev`; `/api/faq` should answer.

## Step 3 — wire the site to the API (Edison, after Step 2 is live)

- Cart checkout → `POST /api/checkout` (SKU + qty only), show the order number,
  keep the confirmation email as the payment step until a gateway exists.
- Panda Club form → `POST /api/subscribe`.
- Test order end-to-end and check it lands in Supabase.

## Step 4 — FAQ bot widget (Edison)

- Chat bubble on the site driven by `/api/faq` + order lookup via
  `/api/order-status`. Human handoff = email to hello@cuppapanda.com.
- ⚠️ Delivery-time conflict must be settled first: footer says UK 5–10 /
  IE-EU 7–12 working days; the PDP overlay says 3–5 days. The bot uses the
  footer version until Joh confirms one canonical matrix.

## Step 5 — payments (blocked on merchant entity)

- Entity undecided (Joh, 2026-10-22). Recommended path: Macau registration +
  PayPal for soft launch → Hong Kong company later for Stripe HK + Airwallex.
- When chosen: add the gateway's hosted-checkout session to `checkout.js` and a
  signed webhook function that flips orders to `paid` (webhook_events table is
  already there for idempotency). Upgrade Supabase to Pro ($25/mo) before this.
- Custom domain cuppapanda.com moves to Cloudflare at this stage (DNS is
  currently parked on Squarespace).

## Costs

- Now: $0 (Cloudflare Free + Supabase Free + GitHub).
- Before real payments: Supabase Pro $25/mo. Gateway transaction fees only.
