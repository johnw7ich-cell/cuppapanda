// POST /api/admin-orders — list recent orders for the shop admins.
// Body: { passcode }  →  { orders: [{ order_no, email, customer_name,
//   address, country, status, currency, subtotal_cents, discount_cents,
//   shipping_cents, total_cents, promo_code, payment_provider, payment_ref,
//   created_at, items: [{ sku, name, unit_price_cents, qty }] }] }
// newest first, limit 50.
//
// Gate: the passcode must match the ADMIN_PASSCODE secret in the Cloudflare
// Pages Production env. No passcode is stored in code or in the repo. If the
// env var is not set, the endpoint reports "not configured" instead of
// listing anything. The page that calls this is /admin.html (noindex,
// linked from nowhere) — admins only: Joh + Jem.
import { sb, json } from './_lib.js';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSCODE) {
    return json({ error: 'Admin access is not configured yet' }, 500);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (String(body.passcode || '') !== env.ADMIN_PASSCODE) {
    return json({ error: 'Wrong passcode' }, 401);
  }
  try {
    const orders = await sb(env,
      `orders?select=id,order_no,email,customer_name,address,country,status,currency,subtotal_cents,discount_cents,shipping_cents,total_cents,promo_code,payment_provider,payment_ref,created_at&order=created_at.desc&limit=50`);
    const out = [];
    for (const o of orders) {
      let items = [];
      try {
        items = await sb(env, `order_items?order_id=eq.${o.id}&select=sku,name,unit_price_cents,qty`);
      } catch (e) {
        console.error(`admin-orders: could not load items for order ${o.order_no}:`, e.message);
      }
      out.push({
        ...o,
        items: items.map(i => ({ sku: i.sku, name: i.name, unit_price_cents: i.unit_price_cents, qty: i.qty })),
      });
    }
    return json({ orders: out });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
