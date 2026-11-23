-- Cuppa Panda — price update (Joh 2026-11-24)
-- Run in the Supabase SQL Editor for the "cuppapanda" project
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Digital singles $4.99 -> $5.99, Pick 10 bundle $9.99 -> $29.99.
-- Checkout re-prices from products.usd_base, so the site shows the new
-- prices but still charges the old ones until this runs.
update public.products set usd_base = 5.99 where sku in (
  'digital-panda-desk-journal', 'digital-adhd-focus-planner', 'digital-calm-workbook',
  'digital-student-planner', 'digital-habit-tracker', 'digital-sticker-pack',
  'digital-notion-template', 'digital-junk-journal-kit', 'digital-colouring-pages',
  'digital-desk-poster-set'
);
update public.products set usd_base = 29.99, meta = 'Pick any 10 digital items — $29.99 for the bundle'
where sku = 'digital-pick-10';
-- Verify:
select sku, usd_base from public.products where sku like 'digital-%' order by sku;
