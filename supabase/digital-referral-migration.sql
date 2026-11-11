-- Cuppa Panda — digital products + referral program migration
-- Run AFTER schema.sql / seed.sql, in the Supabase SQL Editor for the
-- "cuppapanda" project (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- DO NOT run this from anywhere else; it only creates tables and inserts
-- products. Nothing here touches Stripe, R2 or any secret.
--
-- WHAT THIS ADDS
--  * 10 digital products (Series 1) + the $10 Pick 10 bundle, in `products`.
--    Prices: the shop's charm rule is display = floor(usd_base * rate) + 0.99
--    (GBP 0.75 / EUR 0.86 / USD 1). Joh's program prices are "$5 a single"
--    and "$10 Pick 10" for the CUSTOMER, so usd_base is 4.99 / 9.99:
--    USD $4.99 / $9.99, GBP £3.99 / £7.99, EUR €4.99 / €8.99.
--    (usd_base 5.00 would display as $5.99 in USD — not the $5 Joh set.)
--  * referral_codes / referral_uses / referral_milestones — one code per
--    Panda Club member; a use is recorded at checkout (pending) and only
--    granted when the friend's order is PAID (Stripe webhook).
--  * download_credits + credit_ledger — spendable free-download balance.
--    The member gift ("1 free download per member") is enforced by a
--    partial unique index: one credit_ledger row with source='member_join'
--    per email, ever.
--
-- RLS is ON for every new table with NO policies: only the service-role key
-- (used by the Cloudflare Pages Functions) can read/write them, exactly
-- like orders / order_items today. Browsers never see this data.

-- ---------------------------------------------------------------- 1. products
insert into public.products (sku, name, category, usd_base, image, meta, made_to_order) values
  ('digital-panda-desk-journal', 'Panda Desk Journal',       'digital', 4.99, 'images/digital/digital-journal.jpg',   'Printable daily journal — A4 + US Letter', false),
  ('digital-adhd-focus-planner', 'ADHD Focus Planner',       'digital', 4.99, 'images/digital/digital-adhd.jpg',      'Focus, start-task, brain dump & dopamine menu', false),
  ('digital-calm-workbook',      'Panda Calm Desk Workbook', 'digital', 4.99, 'images/digital/digital-calm.jpg',     '30 days, 5–10 minutes a day — gentle self-care', false),
  ('digital-student-planner',    'Student Planner',          'digital', 4.99, 'images/digital/digital-student.jpg',  'Printable + Notion — study, homework & revision', false),
  ('digital-habit-tracker',      'Habit Tracker',            'digital', 4.99, 'images/digital/digital-habit.jpg',    '30-day challenge pack', false),
  ('digital-sticker-pack',       'Digital Sticker Pack',     'digital', 4.99, 'images/digital/digital-stickers.jpg','500 Miniature World stickers — 10 stories', false),
  ('digital-notion-template',    'Notion Template',          'digital', 4.99, 'images/digital/digital-notion.jpg',   'Student & life dashboard', false),
  ('digital-junk-journal-kit',   'Junk Journal Kit',         'digital', 4.99, 'images/digital/digital-junk.jpg',     'Cute modern junk journal', false),
  ('digital-colouring-pages',    'Colouring Pages',          'digital', 4.99, 'images/digital/digital-colouring.jpg','Line art from the Miniature World stories', false),
  ('digital-desk-poster-set',    'Desk Poster Set',          'digital', 4.99, 'images/digital/digital-posters.jpg', '10 storybook covers as printable posters', false),
  ('digital-pick-10',            'Pick 10 Bundle — 10 digital downloads', 'digital', 9.99, 'images/digital/digital-journal.jpg', 'Pick any 10 digital items — $10 for the bundle', false)
on conflict (sku) do update set
  name = excluded.name, category = excluded.category, usd_base = excluded.usd_base,
  image = excluded.image, meta = excluded.meta, made_to_order = excluded.made_to_order;

-- ------------------------------------------------------- 2. referral tables
create table if not exists public.referral_codes (
  code        text primary key,               -- e.g. PANDA-K7Q2M9
  owner_email text not null,                  -- the Panda Club member who shares it
  created_at  timestamptz not null default now(),
  uses_count  integer not null default 0      -- granted (paid) uses only
);
create index if not exists referral_codes_owner_idx on public.referral_codes(owner_email);

create table if not exists public.referral_uses (
  id          bigint generated always as identity primary key,
  code        text not null references public.referral_codes(code),
  buyer_email text not null,                  -- the friend who bought with the code
  order_no    text not null unique,           -- one referral use per order
  status      text not null default 'pending' check (status in ('pending','granted')),
  buyer_credit_pending boolean not null default false, -- buyer picked no +1 item: credit them on payment
  created_at  timestamptz not null default now(),
  granted_at  timestamptz,
  unique (code, buyer_email)                  -- a friend can only use a given code once
);
create index if not exists referral_uses_code_idx on public.referral_uses(code);

-- Milestone rewards (refer 3 / 5 / 10). The +1 credit per referral is the
-- standing reward; milestones add: 3 -> +3 credits + bonus sticker sheet,
-- 5 -> 1 free storybook, 10 -> all 10 storybooks free. The storybook /
-- sticker-sheet fulfilment is a follow-up (those files are not in the
-- 10-product delivery map yet); the milestone row records that it is owed.
create table if not exists public.referral_milestones (
  id         bigint generated always as identity primary key,
  code       text not null references public.referral_codes(code),
  milestone  integer not null check (milestone in (3, 5, 10)),
  reward     text not null,                    -- e.g. 'credits-3', 'storybook-1', 'storybooks-10'
  granted_at timestamptz not null default now(),
  unique (code, milestone)
);

-- -------------------------------------------------------- 3. credit ledger
create table if not exists public.download_credits (
  email      text primary key,
  balance    integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id         bigint generated always as identity primary key,
  email      text not null,
  delta      integer not null,                 -- +1 grant, -1 redeem
  source     text not null,                    -- member_join | referral | referral_buyer | milestone_3 | redeem
  ref        text,                             -- order_no or sku, for audit
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_email_idx on public.credit_ledger(email);
-- The member gift is one per member, ever. The partial unique index enforces
-- it at the database level; the API also checks first and returns a clean error.
create unique index if not exists credit_ledger_member_join_once
  on public.credit_ledger (email) where source = 'member_join';

-- ------------------------------------------------------------- 4. RLS (on)
alter table public.referral_codes      enable row level security;
alter table public.referral_uses       enable row level security;
alter table public.referral_milestones enable row level security;
alter table public.download_credits    enable row level security;
alter table public.credit_ledger       enable row level security;
-- No policies: service-role key only (Cloudflare Functions), like orders.
