# Cuppa Panda — Website v6

Built 2026-10-22 from `Homepage-v5-latest.html` in the CuppaPanda-Handover pack, with all the v3/v4 review fixes applied. The v5 content is unchanged (Bestsellers, Merch, Hero Pick, Blind Box, Little Treats, founder story, Panda Club) — what changed is that everything now works.

## Files
- `index.html` — the homepage (25 KB; photos are separate files, not embedded)
- `catalog.html` — the AW2026 catalog, as supplied in the handover pack (unchanged, self-contained)
- `images/` — 29 photos, using the handover pack's original files and names (supplier photos A–K, hero, merch & catalog-model shots)
- `build_v6.py` — regenerates this build from the handover v5 file

## What was fixed vs v5
- Working cart: Add-to-cart on all 18 products (incl. Merch), drawer with quantities, currency-aware totals using the shop's own .99 pricing (verified against the AW2026 catalog: Journal Kit £14.99/€16.99, Hoodie £33.99/€38.99, Beanie £18.99/€21.99), free-delivery progress (£35/€40/$45), saved in the visitor's browser. Checkout = pre-filled order email to hello@cuppapanda.com (no card payments yet).
- Panda Club signup validates the email and shows the PANDA15 code. Signups are stored in the visitor's browser only — connect a real mailing service before launch.
- Meta description, Open Graph tags, 🐼 favicon.
- Footer email + Instagram/TikTok @cuppapanda are real links.
- Photos extracted and lazy-loaded: page weight 2.41 MB → 25 KB HTML + images on demand.

## Publishing options
- **Preview (GitHub Pages):** push these files to `johnw7ich-cell/cuppapanda` (main branch), enable Pages in repo Settings → live at johnw7ich-cell.github.io/cuppapanda.
- **Real shop (per the handover plan):** rebuild on Squarespace (domain cuppapanda.com is already parked there) using this page as the section-by-section blueprint, with payments in the parent's name, and Printful connected for merch.

## Open items from the handover pack (owner decisions)
- Logo design (hero panda-in-cup direction)
- Confirm final SKU picks, recalculate the first-order budget at real prices, order 1 sample per SKU (nothing ordered yet)
- ⚠️ Do NOT buy sourcing items #15 (Paw Patrol-style shoe charms) or #20 (BTS photo album) — IP risk
- Supplier photos are layout drafts: live store needs own photos of real stock or supplier authorisation
- AI model/merch imagery must be replaced with real photos or labelled before paid advertising
- One discrepancy to confirm: the handover README's pricing example says $18.99 → £13.99/€15.99, but the website code and the AW2026 catalog both give £14.99/€16.99 for the Journal Kit. This build follows the code/catalog.
