-- Cuppa Panda: storybooks set + colouring books 01-10 (Joh, 2026-11-18; books 02-10 added 2026-11-23)
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> paste -> Run):
-- https://supabase.com/dashboard/project/atsrittzwzdaycwafcwd/sql/new
--
-- These are PAID digital products only — they are NOT in the free-download
-- lists (not in DIGITAL_SINGLES in functions/api/_lib.js or index.html), so
-- BOGOF, Pick 10, the referral free pick and the Panda Club free-download
-- claim can never give them away free.
insert into public.products (sku, name, category, usd_base, image, meta, made_to_order) values
  ('digital-storybooks-set-10', 'Story Books — All 10 Miniature World Stories', 'digital', 15.99, 'images/digital/digital-storybook-01.jpg', 'All 10 Miniature World storybooks — printable, 10 pages each', false),
  ('digital-colouring-book', 'Colouring Book — Story 01 Momo', 'digital', 7.99, 'images/digital/digital-colouring-book.jpg', 'Story 01 colouring book — The Teacup Spins Too Fast, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-02', 'Colouring Book — Story 02 Pippa', 'digital', 7.99, 'images/digital/digital-colouring-book-02.png', 'Story 02 colouring book — Pippa''s Wrong Letter, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-03', 'Colouring Book — Story 03 Fenn', 'digital', 7.99, 'images/digital/digital-colouring-book-03.png', 'Story 03 colouring book — Fenn''s Backwards Roller Coaster, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-04', 'Colouring Book — Story 04 Hoot', 'digital', 7.99, 'images/digital/digital-colouring-book-04.png', 'Story 04 colouring book — Hoot''s Ferris Wheel Story Night, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-05', 'Colouring Book — Story 05 Waddle', 'digital', 7.99, 'images/digital/digital-colouring-book-05.png', 'Story 05 colouring book — Waddle''s Brave Slide, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-06', 'Colouring Book — Story 06 Kiki', 'digital', 7.99, 'images/digital/digital-colouring-book-06.png', 'Story 06 colouring book — Kiki Sleeps Through the Ferris Wheel, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-07', 'Colouring Book — Story 07 Miso', 'digital', 7.99, 'images/digital/digital-colouring-book-07.png', 'Story 07 colouring book — Miso''s Bakery Mix-Up, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-08', 'Colouring Book — Story 08 Bramble', 'digital', 7.99, 'images/digital/digital-colouring-book-08.png', 'Story 08 colouring book — Bramble''s Mini World Treasure Hunt, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-09', 'Colouring Book — Story 09 Race', 'digital', 7.99, 'images/digital/digital-colouring-book-09.png', 'Story 09 colouring book — The Great Mini World Race, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-10', 'Colouring Book — Story 10 Lost Ticket', 'digital', 7.99, 'images/digital/digital-colouring-book-10.png', 'Story 10 colouring book — The Lost Ticket and the Sunset Ferris Wheel, 8 pages to colour, printable at home', false)
on conflict (sku) do update set name=excluded.name, usd_base=excluded.usd_base, image=excluded.image, meta=excluded.meta;
