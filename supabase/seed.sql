-- Cuppa Panda — product seed (Step 1)
-- Extracted from the live site (index.html cards) on 2026-10-22 and cross-checked
-- against catalog.html GBP/EUR prices via the charm-pricing rule.
-- usd_base is the single source of truth; GBP = floor(usd*0.75)+0.99, EUR = floor(usd*0.86)+0.99.

insert into public.products (sku, name, category, usd_base, image, meta, made_to_order) values
  ('journal-kit',            'DIY Journal Kit — Everything in One Box',    'stationery', 18.99, 'images/A-journal-kit-1.jpg',            'Everything in one box: journal, stickers, washi, charms', false),
  ('panda-plush-bag-charm',  'Panda Plush Bag Charm — 15cm',               'bag-charm',   9.99, 'images/B-panda-plush-bag-charm-1.jpg',  '15cm plush panda charm for bags',                       false),
  ('capybara-blind-box',     'Capybara Blind Box Figure',                  'blind-box',   6.49, 'images/C-capybara-blind-box-1.jpg',     '6-8 designs + 1 secret rare; contents are a surprise',  false),
  ('beaded-phone-strap',     'Beaded Phone Strap — Butterfly & Pearl',     'accessory',   6.49, 'images/D-beaded-phone-strap-1.jpg',     'Butterfly & pearl beads',                               false),
  ('bread-squishy-set',      'Slow-Rising Squishy — Bread Set',            'squishy',     8.99, 'images/E-bread-squishy-set-1.jpg',      'Slow-rising bread squishies',                           false),
  ('acetate-claw-clip-set',  'Acetate Claw Clip Set',                      'accessory',   6.99, 'images/F-acetate-claw-clip-set-1.jpg',  'Acetate claw clips',                                    false),
  ('waterproof-sticker-pack','Waterproof Sticker Pack — 50 pcs',          'stationery',  3.49, 'images/G-waterproof-sticker-pack-1.jpg', '50 waterproof stickers',                                false),
  ('bread-plush-keychain',   'Bread Plush Keychain',                       'bag-charm',   7.49, 'images/H-bread-plush-keychain-1.jpg',   'Plush bread keychain',                                  false),
  ('pastel-highlighters',    'Pastel Highlighters — 6 Colours',           'stationery',  4.49, 'images/I-pastel-highlighters-1.jpg',    '6 pastel colours',                                      false),
  ('mochi-squishies',        'Mochi Animal Squishies — 10 pcs',           'squishy',     4.49, 'images/J-mochi-squishies-1.jpg',       '10 mini mochi animal squishies',                        false),
  ('washi-tape-set',         'Washi Tape Set — 10 Rolls',                  'stationery',  6.49, 'images/K-washi-tape-set-1.jpg',         '10 rolls of washi tape',                                false),
  ('panda-beanie',           'Panda Beanie — Fluffy Face',                 'merch',      24.99, 'images/catalog-models-beanie.jpg',    'Pink · Mint · Cream · One size',                        true),
  ('panda-cap',              'Panda Cap — Embroidered',                    'merch',      26.99, 'images/catalog-models-cap.jpg',       'Pink · Cream · Adjustable',                             true),
  ('hoodie-pink',            'Cuppa Panda Hoodie — Pink',                  'merch',      44.99, 'images/merch-hoodie-pink.jpg',        'Sizes XS–XL · Oversized fit · Big front print',         true),
  ('sweatshirt-cream',       'Panda Sweatshirt — Cream',                   'merch',      39.99, 'images/merch-sweatshirt-cream.jpg',     'Sizes XS–XL · Embroidered panda chest logo',            true),
  ('backpack-pink',          'Cuppa Panda Backpack — Pink',                'merch',      47.99, 'images/catalog-models-backpack.jpg',    'Panda-in-cup print',                                    true),
  ('panda-socks',            'Panda Socks — 3 Pairs',                      'merch',      16.99, 'images/merch-socks-3pairs.jpg',       'Pink / Cream / Mint · One size (UK 3–6)',               true)
on conflict (sku) do update set
  name = excluded.name, category = excluded.category, usd_base = excluded.usd_base,
  image = excluded.image, meta = excluded.meta, made_to_order = excluded.made_to_order;
