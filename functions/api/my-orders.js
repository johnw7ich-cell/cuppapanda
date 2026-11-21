// POST /api/my-orders — list a customer's past orders by email.
// Body: { email }  →  { email, orders: [{ order_no, status, currency,
//   total_cents, created_at, items: [{ sku, name, qty }] }] } newest first.
// Privacy note: email-only lookup (this shop has no accounts/passwords).
// Returns status + totals + item names only — never address or payment refs.
// Same sensitivity as /api/order-status, which needs order no. + email.
import { sb, json, validEmail } from './_lib.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const email = String(body.email || '').trim().toLowerCase();
  if (!validEmail(email)) return json({ error: 'A valid email is required' }, 400);
  try {
    const orders = await sb(env,
      `orders?email=eq.${encodeURIComponent(email)}&select=id,order_no,status,currency,total_cents,created_at&order=created_at.desc&limit=20`);
    const out = [];
    for (const o of orders) {
      let items = [];
      try {
        items = await sb(env, `order_items?order_id=eq.${o.id}&select=sku,name,qty`);
      } catch (e) {
        console.error(`my-orders: could not load items for order ${o.order_no}:`, e.message);
      }
      out.push({
        order_no: o.order_no, status: o.status, currency: o.currency,
        total_cents: o.total_cents, created_at: o.created_at,
        items: items.map(i => ({ sku: i.sku, name: i.name, qty: i.qty })),
      });
    }
    return json({ email, orders: out });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
