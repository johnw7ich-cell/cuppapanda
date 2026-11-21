// POST /api/admin-chart — order rows for the admin dashboard sales chart.
// Body: { passcode }  →  { orders: [{ created_at, status, total_cents,
//   currency }] } newest first, limit 1000. The dashboard buckets these
// client-side into Weekly (last 7 days), Monthly (last 30 days) or Yearly
// (last 12 months) bars. Only the fields the chart needs are returned —
// no customer names, emails or addresses.
// Same ADMIN_PASSCODE gate as /api/admin-orders (see that file). The page
// that calls this is /admin.html (noindex, linked from nowhere).
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
      `orders?select=created_at,status,total_cents,currency&order=created_at.desc&limit=1000`);
    return json({ orders });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
