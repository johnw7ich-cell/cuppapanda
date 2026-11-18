-- Cuppa Panda: storybooks set + colouring book products (Joh, 2026-11-18)
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> paste -> Run):
-- https://supabase.com/dashboard/project/atsrittzwzdaycwafcwd/sql/new
--
-- These are PAID digital products only — they are NOT in the free-download
-- lists (not in DIGITAL_SINGLES in functions/api/_lib.js or index.html), so
-- BOGOF, Pick 10, the referral free pick and the Panda Club free-download
-- claim can never give them away free.
insert into public.products (sku, name, category, usd_base, image, meta, made_to_order) values
  ('digital-storybooks-set-10', 'Story Books — All 10 Miniature World Stories', 'digital', 15.99, 'images/digital/digital-storybook-01.jpg', 'All 10 Miniature World storybooks — printable, 10 pages each', false),
  ('digital-colouring-book', 'Colouring Book — Story 01 Momo', 'digital', 7.99, 'images/digital/digital-colouring-book.jpg', 'Story 01 colouring book — The Teacup Spins Too Fast, 8 pages to colour, printable at home', false)
on conflict (sku) do update set name=excluded.name, usd_base=excluded.usd_base, image=excluded.image, meta=excluded.meta;
