-- Cuppa Panda — Supabase schema (Step 1)
-- Run this in the Supabase SQL Editor for the "cuppapanda" project, then run seed.sql.
-- Design notes:
--  * Prices live here (usd_base). The website NEVER sets prices; the checkout
--    function re-reads them server-side and applies the shop's charm-pricing
--    rule: display price = floor(usd_base * rate) + 0.99  (GBP 0.75 / EUR 0.86 / USD 1)
--  * Card data never touches this database — payments stay on the gateway's
--    hosted checkout page. Orders only record provider + reference.
--  * RLS is ON for every table. The public (anon) key can only read active
--    products. Everything else is service-role only (used by the Cloudflare
--    functions), so order data is never exposed to browsers.

create table if not exists public.products (
  sku           text primary key,
  name          text not null,
  category      text not null default 'stationery',
  usd_base      numeric(10,2) not null check (usd_base >= 0),
  image         text,
  meta          text,
  made_to_order boolean not null default false,
  stock         integer,               -- null = not tracked yet
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_no        text not null unique,          -- e.g. CP-20261023-4831
  email           text not null,
  customer_name   text,
  address         jsonb,                          -- delivery address as given at checkout
  country         text,
  currency        text not null default 'GBP',
  subtotal_cents  integer not null,
  discount_cents  integer not null default 0,
  shipping_cents  integer,                        -- null = confirmed by email (until a flat fee is set)
  total_cents     integer not null,
  promo_code      text,
  status          text not null default 'pending'
                  check (status in ('pending','paid','fulfilled','shipped','delivered','refunded','cancelled')),
  payment_provider text,                          -- null until a gateway is chosen (entity decision)
  payment_ref      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.order_items (
  id              bigint generated always as identity primary key,
  order_id        uuid not null references public.orders(id) on delete cascade,
  sku             text not null,
  name            text not null,                  -- snapshot at time of order
  unit_price_cents integer not null,
  qty             integer not null check (qty > 0)
);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

create table if not exists public.subscribers (
  email           text primary key,
  source          text not null default 'website',
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists public.webhook_events (
  provider    text not null,
  event_id    text not null,
  payload     jsonb not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)                -- idempotency: duplicate webhooks are ignored
);

create table if not exists public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  topic      text,
  message    text not null,
  status     text not null default 'open' check (status in ('open','replied','closed')),
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.products       enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.subscribers    enable row level security;
alter table public.webhook_events enable row level security;
alter table public.support_tickets enable row level security;

drop policy if exists "products are public" on public.products;
create policy "products are public" on public.products
  for select using (active = true);
-- No other policies: anon/authenticated keys get nothing else.
-- The Cloudflare functions use the service-role key, which bypasses RLS.
