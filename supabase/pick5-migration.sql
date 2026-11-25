-- Cuppa Panda: Pick 5 bundle (Joh, 2026-11-25) — pick any 5 digital downloads, 30% off
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> paste -> Run):
-- https://supabase.com/dashboard/project/atsrittzwzdaycwafcwd/sql/new
--
-- $20.99 for any 5 digital singles (list $29.95) — 30% off in USD. The 5
-- picks are $0 order lines (same mechanism as Pick 10); the bundle SKU is
-- the only paid line. The bundle SKU is NOT in DIGITAL_SINGLES, so BOGOF,
-- referral free pick and Panda Club free claim can never give it away.
insert into public.products (sku, name, category, usd_base, image, meta, made_to_order) values
  ('digital-pick-5', 'Pick 5 Bundle — 5 digital downloads', 'digital', 20.99, 'images/digital/digital-journal.jpg', 'Pick any 5 digital items — 30% off, $20.99 for the bundle', false)
on conflict (sku) do update set name=excluded.name, usd_base=excluded.usd_base, image=excluded.image, meta=excluded.meta;
