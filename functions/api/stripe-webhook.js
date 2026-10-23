// POST /api/stripe-webhook — Stripe webhook endpoint (Step 5)
// Registered in the Stripe dashboard as https://cuppapanda.com/api/stripe-webhook
// for checkout.session.completed + checkout.session.expired.
//
// Trust rules:
// - The Stripe-Signature header is verified against STRIPE_WEBHOOK_SECRET over
//   the RAW body (HMAC-SHA256, WebCrypto — no SDK). Bad/old signature -> 400.
// - Only a verified 'checkout.session.completed' whose amount_total + currency
//   match the stored order may flip it to 'paid'. A browser landing on the
//   success URL proves nothing on its own.
// - Every verified event is recorded in webhook_events first; its
//   (provider, event_id) primary key makes Stripe redeliveries harmless.
// Env vars: STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import { sb, json } from './_lib.js';

const TOLERANCE_SECONDS = 300; // Stripe's recommended 5-minute replay window

function hexToBytes(hex) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function verifySignature(rawBody, header, secret) {
  if (!header) return false;
  let t = null;
  const sigs = [];
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === 't') t = v;
    if (k === 'v1') sigs.push(v); // several v1 values can appear during key rotation
  }
  if (!t || !sigs.length) return false;
  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return false;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  );
  const payload = new TextEncoder().encode(`${t}.${rawBody}`);
  for (const sig of sigs) {
    const bytes = hexToBytes(sig);
    if (!bytes) continue;
    try {
      if (await crypto.subtle.verify('HMAC', key, bytes, payload)) return true;
    } catch { /* malformed signature bytes — try the next one */ }
  }
  return false;
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: 'Webhook is not configured' }, 500);

  const rawBody = await request.text();
  const verified = await verifySignature(rawBody, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!verified) return json({ error: 'Invalid signature' }, 400);

  let event;
  try { event = JSON.parse(rawBody); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!event.id || !event.type) return json({ error: 'Not a Stripe event' }, 400);

  try {
    // Idempotency: first delivery inserts the row; a redelivery conflicts and
    // (with ignore-duplicates + return=representation) comes back as [], so we
    // acknowledge it without reprocessing.
    const rows = await sb(env, 'webhook_events', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ provider: 'stripe', event_id: event.id, payload: event }),
    });
    if (!rows || !rows.length) return json({ received: true, duplicate: true });

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object || {};
        const no = (session.metadata && session.metadata.order_no) || session.client_reference_id;
        if (no) {
          const found = await sb(env, `orders?order_no=eq.${encodeURIComponent(no)}&select=id,status,currency,total_cents`);
          const order = found && found[0];
          if (order && order.status !== 'paid') {
            const amountOk = session.amount_total === order.total_cents;
            const currencyOk = String(session.currency || '').toUpperCase() === order.currency;
            // Delayed payment methods can complete a session before the money
            // lands; only trust payment_status 'paid' when Stripe reports one.
            const paidOk = !session.payment_status || session.payment_status === 'paid';
            if (amountOk && currencyOk && paidOk) {
              await sb(env, `orders?id=eq.${order.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  status: 'paid', payment_provider: 'stripe',
                  payment_ref: session.payment_intent || session.id,
                }),
              });
            } else {
              console.error(
                `Stripe webhook: NOT marking ${no} paid — session amount ${session.amount_total} ${session.currency} ` +
                `payment_status=${session.payment_status || 'n/a'} vs order ${order.total_cents} ${order.currency}`,
              );
            }
          }
        }
      }
      // 'checkout.session.expired' (and any other type): recording the event
      // above is the whole job — an expired session leaves the order 'pending'
      // so the shop can still follow up by email.
    } catch (e) {
      // Processing failed after the event was recorded (e.g. Supabase briefly
      // down). Remove the idempotency row so Stripe's automatic retry can
      // actually reprocess, then ask for that retry with a 500.
      await sb(env, `webhook_events?provider=eq.stripe&event_id=eq.${encodeURIComponent(event.id)}`, { method: 'DELETE' }).catch(() => {});
      throw e;
    }
    return json({ received: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
