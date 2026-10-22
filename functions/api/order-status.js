// POST /api/order-status — FAQ bot / customer order lookup.
// Requires BOTH the order number and the email used for the order, so an order
// number alone never exposes anyone's data. Returns status + totals only.
import { sb, json } from './_lib.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const no = String(body.order_no || '').trim().toUpperCase();
  const email = String(body.email || '').trim().toLowerCase();
  if (!no || !email) return json({ error: 'Order number and email are both required' }, 400);
  try {
    const rows = await sb(env, `orders?order_no=eq.${encodeURIComponent(no)}&select=order_no,email,status,currency,total_cents,created_at`);
    const order = rows.find(r => r.email.toLowerCase() === email);
    if (!order) return json({ error: 'No order found for that order number and email' }, 404);
    return json({ order_no: order.order_no, status: order.status, currency: order.currency, total_cents: order.total_cents, created_at: order.created_at });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
