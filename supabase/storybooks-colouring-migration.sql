-- Cuppa Panda: storybooks set + colouring books 01-10 (Joh, 2026-11-18; books 02-10 added 2026-11-23)
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> paste -> Run):
-- https://supabase.com/dashboard/project/atsrittzwzdaycwafcwd/sql/new
--
-- These are PAID digital products only — they are NOT in the free-download
-- lists (not in DIGITAL_SINGLES in functions/api/_lib.js or index.html), so
-- BOGOF, Pick 10, the referral free pick and the Panda Club free-download
-- claim can never give them away free.
insert into public.products (sku, name, category, usd_base, image, meta, made_to_order) values
  ('digital-storybooks-set-10', 'Story Books — All 10 Miniature World Stories', 'digital', 39.99, 'images/digital/digital-storybook-01.jpg', 'All 10 Miniature World storybooks — printable, 10 pages each', false),
  ('digital-storybooks-set-10-bundle', 'Story Books + Colouring Books Bundle — All 10 Miniature World Stories', 'digital', 49.99, 'images/digital/digital-storybook-01.jpg', 'All 10 storybooks + all 10 colouring books — $49.99 ($39.99 + $10)', false),
  ('digital-storybook-01', 'The Teacup Spins Too Fast', 'digital', 6.99, 'images/digital/digital-storybook-01.jpg', 'Story 01 · Momo the Capybara — 10 illustrated pages, printable', false),
  ('digital-storybook-02', 'Pippa''s Wrong Letter', 'digital', 6.99, 'images/digital/digital-storybook-02.jpg', 'Story 02 · Pippa the Rabbit — 10 illustrated pages, printable', false),
  ('digital-storybook-03', 'Fenn''s Backwards Roller Coaster', 'digital', 6.99, 'images/digital/digital-storybook-03.jpg', 'Story 03 · Fenn the Fox — 10 illustrated pages, printable', false),
  ('digital-storybook-04', 'Hoot''s Ferris Wheel Story Night', 'digital', 6.99, 'images/digital/digital-storybook-04.jpg', 'Story 04 · Hoot the Owl — 10 illustrated pages, printable', false),
  ('digital-storybook-05', 'Waddle''s Brave Slide', 'digital', 6.99, 'images/digital/digital-storybook-05.jpg', 'Story 05 · Waddle the Penguin — 10 illustrated pages, printable', false),
  ('digital-storybook-06', 'Kiki Sleeps Through the Ferris Wheel', 'digital', 6.99, 'images/digital/digital-storybook-06.jpg', 'Story 06 · Kiki the Koala — 10 illustrated pages, printable', false),
  ('digital-storybook-07', 'Miso''s Bakery Mix-Up', 'digital', 6.99, 'images/digital/digital-storybook-07.jpg', 'Story 07 · Miso the Cat — 10 illustrated pages, printable', false),
  ('digital-storybook-08', 'Bramble''s Mini World Treasure Hunt', 'digital', 6.99, 'images/digital/digital-storybook-08.jpg', 'Story 08 · Bramble the Hedgehog — 10 illustrated pages, printable', false),
  ('digital-storybook-09', 'The Great Mini World Race', 'digital', 6.99, 'images/digital/digital-storybook-09.jpg', 'Story 09 · Panda and all eight friends — 10 illustrated pages, printable', false),
  ('digital-storybook-10', 'The Lost Ticket and the Sunset Ferris Wheel', 'digital', 6.99, 'images/digital/digital-storybook-10.jpg', 'Story 10 · Panda and all eight friends — 10 illustrated pages, printable', false),
  ('digital-colouring-book', 'Colouring Book — Story 01 Momo', 'digital', 3.99, 'images/digital/digital-colouring-book.jpg', 'Story 01 colouring book — The Teacup Spins Too Fast, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-02', 'Colouring Book — Story 02 Pippa', 'digital', 3.99, 'images/digital/digital-colouring-book-02.png', 'Story 02 colouring book — Pippa''s Wrong Letter, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-03', 'Colouring Book — Story 03 Fenn', 'digital', 3.99, 'images/digital/digital-colouring-book-03.png', 'Story 03 colouring book — Fenn''s Backwards Roller Coaster, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-04', 'Colouring Book — Story 04 Hoot', 'digital', 3.99, 'images/digital/digital-colouring-book-04.png', 'Story 04 colouring book — Hoot''s Ferris Wheel Story Night, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-05', 'Colouring Book — Story 05 Waddle', 'digital', 3.99, 'images/digital/digital-colouring-book-05.png', 'Story 05 colouring book — Waddle''s Brave Slide, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-06', 'Colouring Book — Story 06 Kiki', 'digital', 3.99, 'images/digital/digital-colouring-book-06.png', 'Story 06 colouring book — Kiki Sleeps Through the Ferris Wheel, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-07', 'Colouring Book — Story 07 Miso', 'digital', 3.99, 'images/digital/digital-colouring-book-07.png', 'Story 07 colouring book — Miso''s Bakery Mix-Up, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-08', 'Colouring Book — Story 08 Bramble', 'digital', 3.99, 'images/digital/digital-colouring-book-08.png', 'Story 08 colouring book — Bramble''s Mini World Treasure Hunt, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-09', 'Colouring Book — Story 09 Race', 'digital', 3.99, 'images/digital/digital-colouring-book-09.png', 'Story 09 colouring book — The Great Mini World Race, 8 pages to colour, printable at home', false),
  ('digital-colouring-book-10', 'Colouring Book — Story 10 Lost Ticket', 'digital', 3.99, 'images/digital/digital-colouring-book-10.png', 'Story 10 colouring book — The Lost Ticket and the Sunset Ferris Wheel, 8 pages to colour, printable at home', false),
  ('digital-colouring-set-10', 'Colouring Books — All 10 Miniature World Stories', 'digital', 19.99, 'images/digital/digital-colouring-book.jpg', 'All 10 colouring books — 80 pages to colour, printable at home', false),
  ('digital-storybook-01-bundle', 'Storybook + Colouring Book Bundle — Story 01 Momo', 'digital', 7.99, 'images/digital/digital-storybook-01.jpg', 'Story 01 bundle — storybook + colouring book, $7.99 ($6.99 + $1)', false),
  ('digital-storybook-02-bundle', 'Storybook + Colouring Book Bundle — Story 02 Pippa', 'digital', 7.99, 'images/digital/digital-storybook-02.jpg', 'Story 02 bundle — storybook + colouring book, $7.99 ($6.99 + $1)', false),
  ('digital-storybook-03-bundle', 'Storybook + Colouring Book Bundle — Story 03 Fenn', 'digital', 7.99, 'images/digital/digital-storybook-03.jpg', 'Story 03 bundle — storybook + colouring book, $7.99 ($6.99 + $1)', false),
  ('digital-storybook-04-bundle', 'Storybook + Colouring Book Bundle — Story 04 Hoot', 'digital', 7.99, 'images/digital/digital-storybook-04.jpg', 'Story 04 bundle — storybook + colouring book, $7.99 ($6.99 + $1)', false),
  ('digital-storybook-05-bundle', 'Storybook + Colouring Book Bundle — Story 05 Waddle', 'digital', 7.99, 'images/digital/digital-storybook-05.jpg', 'Story 05 bundle — storybook + colouring book, $7.99 ($6.99 + $1)', false),
  ('digital-storybook-06-bundle', 'Storybook + Colouring Book Bundle — Story 06 Kiki', 'digital', 7.99, 'images/digital/digital-storybook-06.jpg', 'Story 06 bundle — storybook + colouring book, $7.99 ($6.99 + $1)', false),
  ('digital-storybook-07-bundle', 'Storybook + Colouring Book Bundle — Story 07 Miso', 'digital', 7.99, 'images/digital/digital-storybook-07.jpg', 'Story 07 bundle — storybook + colouring book, $7.99 ($6.99 + $1)', false),
  ('digital-storybook-08-bundle', 'Storybook + Colouring Book Bundle — Story 08 Bramble', 'digital', 7.99, 'images/digital/digital-storybook-08.jpg', 'Story 08 bundle — storybook + colouring book, $7.99 ($6.99 + $1)', false),
  ('digital-storybook-09-bundle', 'Storybook + Colouring Book Bundle — Story 09 Race', 'digital', 7.99, 'images/digital/digital-storybook-09.jpg', 'Story 09 bundle — storybook + colouring book, $7.99 ($6.99 + $1)', false),
  ('digital-storybook-10-bundle', 'Storybook + Colouring Book Bundle — Story 10 Lost Ticket', 'digital', 7.99, 'images/digital/digital-storybook-10.jpg', 'Story 10 bundle — storybook + colouring book, $7.99 ($6.99 + $1)', false)
on conflict (sku) do update set name=excluded.name, usd_base=excluded.usd_base, image=excluded.image, meta=excluded.meta;
