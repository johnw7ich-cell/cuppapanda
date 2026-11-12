// POST /api/download — get a time-limited download link for a digital item.
// Body: { email, sku, order_no? }  → { url, via, expires_in }
// Two ways in, in this order:
//   1. Paid order: a 'paid' order for this email contains the sku (re-downloads
//      are free — no credit is spent). If order_no is given, that order only.
//   2. Credits: the member has a download-credit balance >= 1 (earned by
//      referrals). One credit is spent and the spend is written to the ledger.
// Anything else -> 400. Email-mode (unpaid) orders cannot download until the
// shop marks the order paid.
import { sb, json, validEmail, isDigitalSingle, getBalance, grantCredit } from './_lib.js';
import { signedDownloadUrl } from './_download.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const email = String(body.email || '').trim().toLowerCase();
  const sku = String(body.sku || '').trim();
  const orderNo = body.order_no ? String(body.order_no).trim().toUpperCase() : null;
  if (!validEmail(email)) return json({ error: 'A valid email is required' }, 400);
  if (!isDigitalSingle(sku)) return json({ error: 'Pick one of the 10 digital downloads' }, 400);
  try {
    // 1. Paid order containing this sku.
    let orderQuery = `orders?email=eq.${encodeURIComponent(email)}&status=eq.paid&select=id,order_no`;
    if (orderNo) orderQuery += `&order_no=eq.${encodeURIComponent(orderNo)}`;
    const orders = await sb(env, orderQuery);
    for (const o of orders) {
      const items = await sb(env, `order_items?order_id=eq.${o.id}&sku=eq.${encodeURIComponent(sku)}&select=id`);
      if (items.length) {
        const link = await signedDownloadUrl(env, sku);
        return json({ ok: true, sku, order_no: o.order_no, ...link });
      }
    }
    // 2. Spend one download credit.
    const balance = await getBalance(env, email);
    if (balance < 1) {
      return json({ error: 'No paid order or download credit found for this item — buy it, or earn a credit by referring a friend.' }, 402);
    }
    await grantCredit(env, email, -1, 'redeem', sku);
    const link = await signedDownloadUrl(env, sku);
    return json({ ok: true, sku, credits_left: balance - 1, ...link });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
