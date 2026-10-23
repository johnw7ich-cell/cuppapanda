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
    gateway is connected; when `STRIPE_SECRET_KEY` is set it also creates a
    Stripe Checkout Session and returns `payment_mode: 'stripe'` +
    `checkout_url` (see Step 5).
  - `stripe-webhook.js` — Stripe webhook endpoint (Step 5). Verifies the
    `Stripe-Signature` header (HMAC-SHA256 over the raw body), records events
    in `webhook_events` for idempotency, and flips an order to `paid` only
    when a `checkout.session.completed` amount + currency match the order.
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

## Step 5 — payments: Stripe (code ready 2026-10-23; keys pending)

Joh opened a Stripe account under a UK entity (2026-10-23; the account still
shows "Payments paused" until activation/KYC is completed in the dashboard).
Integration mode chosen there: **Prebuilt checkout** (Stripe-hosted Checkout).

How it works:

- `checkout.js` still creates the `pending` order first, with totals recomputed
  server-side. **Only if `STRIPE_SECRET_KEY` is set** does it then create a
  Stripe Checkout Session from those server-side lines (promo → a reusable
  Stripe coupon, e.g. PANDA15 → `panda15-15`; shipping passed only when it is a
  known amount — free shipping = 0, `null`/"confirm by email" = omitted) and
  returns `checkout_url`. The browser redirects there; the cart is kept until
  the customer returns. If the Stripe API call fails, checkout silently falls
  back to `email` mode — the order is never lost. With no key set, behaviour is
  exactly the old email mode.
- The customer returns to `https://cuppapanda.com/?order=<no>&paid=1` (or
  `&cancelled=1`); `index.html` shows a banner, clears the cart on `paid=1`,
  and cleans the URL. **That redirect is cosmetic only** — an order becomes
  `paid` solely via the webhook below.
- `stripe-webhook.js` verifies the signature, records the event (idempotent),
  cross-checks `amount_total` + `currency` against the stored order, and only
  then sets `status='paid'` with `payment_ref` = the PaymentIntent id.
  `checkout.session.expired` just leaves the order `pending` for email follow-up.

Setup (Joh, in the Stripe dashboard + Cloudflare Pages → Settings → Environment
variables, Production). Keys go through the secure entry flow — never chat:

- `STRIPE_SECRET_KEY` — Stripe Dashboard → Developers → API keys → Secret key.
- `STRIPE_WEBHOOK_SECRET` — created when registering the endpoint below.
- Register the webhook: Developers → Webhooks → Add endpoint →
  URL `https://cuppapanda.com/api/stripe-webhook`, events
  `checkout.session.completed` and `checkout.session.expired`.

Rollout — test mode first, always:

1. Use **test** API keys (`sk_test_…` / test-mode webhook secret) in Cloudflare.
2. Place a test order on the site and pay with card `4242 4242 4242 4242`
   (any future expiry / CVC). Confirm: the order flips to `paid` in Supabase,
   the row appears in `webhook_events`, and a redelivered event changes nothing.
3. Also test the cancel path (back out of Checkout → `?cancelled=1`, cart intact).
4. Upgrade **Supabase to Pro ($25/mo)** before real money — the Free project
   pauses when idle, which would break webhook order updates.
5. Swap in the **live** keys (`sk_live_…`, live webhook endpoint + secret),
   re-run one small real order, then announce.
- Note: UK/EU VAT duties (UK VAT ≤£135 consignments, EU IOSS ≤€150) sit with
  the seller regardless of gateway — accountant advice before live sales.

## Costs

- Now: $0 (Cloudflare Free + Supabase Free + GitHub).
- Before real payments: Supabase Pro $25/mo. Gateway transaction fees only.
