// POST /api/checkout — provider-neutral checkout (Step 3 target, code ready in Step 1)
// Body: { items: [{sku, qty}], currency, country, email, name, address, promo }
// - Prices are re-read from Supabase and recomputed server-side (never trust the browser).
// - Creates a 'pending' order. Until a payment gateway is connected (merchant-entity
//   decision), payment_mode stays 'email': the shop confirms by email and sends a
//   payment link, exactly like the current site. When a gateway is chosen, this is
//   the single place that creates its hosted-checkout session; the webhook then
//   flips the order to 'paid'.
import { sb, json, unitCents, FREE_SHIP, FLAT_SHIPPING, PROMOS, orderNo } from './_lib.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const items = Array.isArray(body.items) ? body.items.filter(i => i && i.sku && i.qty > 0) : [];
  if (!items.length) return json({ error: 'Cart is empty' }, 400);
  const currency = ['GBP', 'EUR', 'USD'].includes(body.currency) ? body.currency : 'GBP';
  const email = String(body.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'A valid email is required' }, 400);

  try {
    const skus = [...new Set(items.map(i => i.sku))];
    const products = await sb(env, `products?sku=in.(${skus.join(',')})&active=eq.true&select=sku,name,usd_base,stock`);
    const bySku = Object.fromEntries(products.map(p => [p.sku, p]));

    let subtotal = 0;
    const lines = [];
    for (const i of items) {
      const p = bySku[i.sku];
      if (!p) return json({ error: `Unknown or unavailable product: ${i.sku}` }, 400);
      const qty = Math.min(99, Math.floor(i.qty));
      const unit = unitCents(Number(p.usd_base), currency);
      subtotal += unit * qty;
      lines.push({ sku: p.sku, name: p.name, unit_price_cents: unit, qty });
    }

    const promo = body.promo ? String(body.promo).toUpperCase().trim() : null;
    const discount = promo && PROMOS[promo] ? Math.round(subtotal * PROMOS[promo]) : 0;
    const goodsTotal = subtotal - discount;
    const freeShip = goodsTotal / 100 >= FREE_SHIP[currency];
    const flat = FLAT_SHIPPING[currency];
    const shipping = freeShip ? 0 : (flat === null ? null : Math.round(flat * 100));
    const total = goodsTotal + (shipping ?? 0);

    const no = orderNo();
    const [order] = await sb(env, 'orders', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        order_no: no, email, customer_name: body.name || null,
        address: body.address || null, country: body.country || null,
        currency, subtotal_cents: subtotal, discount_cents: discount,
        shipping_cents: shipping, total_cents: total,
        promo_code: promo, status: 'pending', payment_provider: null,
      }),
    });
    await sb(env, 'order_items', {
      method: 'POST',
      body: JSON.stringify(lines.map(l => ({ ...l, order_id: order.id }))),
    });

    return json({
      order_no: no, currency, subtotal_cents: subtotal, discount_cents: discount,
      shipping_cents: shipping, free_shipping: freeShip, total_cents: total,
      status: 'pending', payment_mode: 'email',
      note: 'Order received. We will email you to confirm and send a secure payment link.',
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
