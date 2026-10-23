// POST /api/checkout — provider-neutral checkout (Step 3; Stripe added in Step 5)
// Body: { items: [{sku, qty}], currency, country, email, name, address, promo }
// - Prices are re-read from Supabase and recomputed server-side (never trust the browser).
// - Creates a 'pending' order. If STRIPE_SECRET_KEY is set (Cloudflare env), a
//   Stripe Checkout Session is created from the server-recomputed lines and the
//   response carries payment_mode 'stripe' + checkout_url; the signed webhook
//   (stripe-webhook.js) is what flips the order to 'paid' — never this response.
// - Without the key, payment_mode stays 'email': the shop confirms by email and
//   sends a payment link, exactly like the current site. A Stripe API failure
//   also falls back to email mode — the saved order is never lost.
import { sb, json, unitCents, FREE_SHIP, FLAT_SHIPPING, PROMOS, orderNo } from './_lib.js';

const SHOP_URL = 'https://cuppapanda.com';

async function stripePost(env, path, params) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Stripe ${res.status}: ${(data.error && data.error.message) || 'request failed'}`);
    err.stripeCode = data.error && data.error.code;
    throw err;
  }
  return data;
}

// Builds a Stripe Checkout Session from the order's server-side lines.
// Amounts come only from `lines` (Supabase prices + charm rule), never the client.
async function createStripeSession(env, { no, email, currency, lines, promo, discount, shipping }) {
  const cur = currency.toLowerCase();
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('customer_email', email);
  params.set('client_reference_id', no);
  params.set('metadata[order_no]', no);
  params.set('payment_intent_data[metadata][order_no]', no);
  params.set('success_url', `${SHOP_URL}/?order=${no}&paid=1`);
  params.set('cancel_url', `${SHOP_URL}/?order=${no}&cancelled=1`);
  lines.forEach((l, i) => {
    params.set(`line_items[${i}][quantity]`, String(l.qty));
    params.set(`line_items[${i}][price_data][currency]`, cur);
    params.set(`line_items[${i}][price_data][unit_amount]`, String(l.unit_price_cents));
    params.set(`line_items[${i}][price_data][product_data][name]`, l.name);
  });
  // Promo: one deterministic coupon per exact discount amount (e.g. PANDA15 in
  // GBP with 120 off -> 'panda15-gbp-120'), created once and reused; Stripe
  // rejects re-creating an existing id, which we ignore. We deliberately use
  // amount_off with OUR server-computed discount instead of percent_off:
  // Stripe's own percentage rounding can differ by a cent, which would make
  // the charged total differ from the quoted total and fail the webhook's
  // exact amount check. With amount_off, Stripe's total is exact by construction.
  if (discount > 0 && promo && PROMOS[promo]) {
    const pct = Math.round(PROMOS[promo] * 100);
    const couponId = `${promo.toLowerCase()}-${cur}-${discount}`;
    const cp = new URLSearchParams();
    cp.set('id', couponId);
    cp.set('amount_off', String(discount));
    cp.set('currency', cur);
    cp.set('duration', 'once');
    cp.set('name', `${promo} - ${pct}% off`);
    try {
      await stripePost(env, 'coupons', cp);
    } catch (e) {
      if (e.stripeCode !== 'resource_already_exists' && !/already exists/i.test(e.message)) throw e;
    }
    params.set('discounts[0][coupon]', couponId);
  }
  // Shipping: only when we actually know it. null = "confirmed by email", so
  // the session carries no shipping option in that case.
  if (shipping !== null && shipping !== undefined) {
    params.set('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    params.set('shipping_options[0][shipping_rate_data][display_name]', shipping === 0 ? 'Free delivery' : 'Delivery');
    params.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(shipping));
    params.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]', cur);
  }
  return stripePost(env, 'checkout/sessions', params);
}

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

    // Step 5: Stripe hosted checkout, only when the secret key is configured.
    // The order stays 'pending' here; the webhook confirms payment later.
    if (env.STRIPE_SECRET_KEY) {
      try {
        const session = await createStripeSession(env, { no, email, currency, lines, promo, discount, shipping });
        await sb(env, `orders?id=eq.${order.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ payment_provider: 'stripe', payment_ref: session.id }),
        });
        return json({
          order_no: no, currency, subtotal_cents: subtotal, discount_cents: discount,
          shipping_cents: shipping, free_shipping: freeShip, total_cents: total,
          status: 'pending', payment_mode: 'stripe', checkout_url: session.url,
          note: 'Redirecting you to secure payment…',
        });
      } catch (e) {
        console.error('Stripe session failed, falling back to email mode:', e.message);
      }
    }

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
