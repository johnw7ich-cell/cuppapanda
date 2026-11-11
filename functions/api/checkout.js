// POST /api/checkout — provider-neutral checkout (Step 3; Stripe added in Step 5;
// digital program added 2026-11-11, Joh-approved: $5 single buy-1-get-1-free,
// $10 Pick 10 bundle, referral codes, Panda Club 1-free-download credits).
// Body: { items: [{sku, qty}], currency, country, email, name, address, promo,
//         bogof_free?, pick10?, referral_code?, referral_free? }
// - Prices are re-read from Supabase and recomputed server-side (never trust the browser).
// - Free picks (BOGOF, Pick 10, referral +1) are recorded as $0 order_items so
//   delivery knows exactly what was promised. They are NEVER sent to Stripe:
//   Stripe Checkout rejects $0 line items; only paid lines go in the session.
//   The webhook's amount check still matches, because the order total only
//   ever counts paid lines.
// - Digital-only orders ship free (shipping_cents 0, no address needed).
// - A referral use is recorded as 'pending' here; the Stripe webhook grants
//   the referrer's credit (and any buyer credit) only when the order is PAID.
// - Creates a 'pending' order. If STRIPE_SECRET_KEY is set (Cloudflare env), a
//   Stripe Checkout Session is created from the server-recomputed lines and the
//   response carries payment_mode 'stripe' + checkout_url; the signed webhook
//   (stripe-webhook.js) is what flips the order to 'paid' — never this response.
// - Without the key, payment_mode stays 'email': the shop confirms by email and
//   sends a payment link, exactly like the current site. A Stripe API failure
//   also falls back to email mode — the saved order is never lost.
import { sb, json, unitCents, FREE_SHIP, FLAT_SHIPPING, PROMOS, orderNo, DIGITAL_BUNDLE, DIGITAL_SINGLES, isDigitalSingle } from './_lib.js';

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

// Builds a Stripe Checkout Session from the order's PAID lines only.
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
    const products = await sb(env, `products?sku=in.(${skus.join(',')})&active=eq.true&select=sku,name,usd_base,stock,category`);
    const bySku = Object.fromEntries(products.map(p => [p.sku, p]));

    let subtotal = 0;
    const lines = [];
    for (const i of items) {
      const p = bySku[i.sku];
      if (!p) return json({ error: `Unknown or unavailable product: ${i.sku}` }, 400);
      const qty = Math.min(99, Math.floor(i.qty));
      if (i.sku === DIGITAL_BUNDLE && qty !== 1) {
        return json({ error: 'Pick 10 bundle: one bundle per order' }, 400);
      }
      const unit = unitCents(Number(p.usd_base), currency);
      subtotal += unit * qty;
      lines.push({ sku: p.sku, name: p.name, unit_price_cents: unit, qty });
    }
    const digitalOnly = lines.every(l => (bySku[l.sku].category || '') === 'digital');
    const paidLines = lines.filter(l => l.unit_price_cents > 0);

    // --- Digital free picks ($0 lines, recorded in order_items only) ---
    const freeItems = [];
    const addFree = sku => {
      const p = bySku[sku] || null;
      lines.push({ sku, name: p ? p.name : sku, unit_price_cents: 0, qty: 1 });
      freeItems.push(sku);
    };
    // BOGOF: exactly one digital single (qty 1) in the cart, no bundle.
    // The free pick must be a digital single. One BOGOF per order.
    const singleLines = lines.filter(l => isDigitalSingle(l.sku) && l.qty === 1);
    const hasBundle = lines.some(l => l.sku === DIGITAL_BUNDLE);
    if (body.bogof_free) {
      const free = String(body.bogof_free).trim();
      if (!isDigitalSingle(free)) return json({ error: 'The free BOGOF pick must be one of the 10 digital downloads' }, 400);
      if (hasBundle) return json({ error: 'Buy 1 get 1 free does not apply with the Pick 10 bundle' }, 400);
      if (singleLines.length !== 1) return json({ error: 'Buy 1 get 1 free needs exactly one digital item in the cart' }, 400);
      addFree(free);
    }
    // Pick 10: the bundle is in the cart; body.pick10 must be exactly 10
    // distinct digital singles. Each becomes a $0 line on the order.
    if (hasBundle) {
      const picks = Array.isArray(body.pick10) ? body.pick10.map(s => String(s).trim()) : [];
      if (picks.length !== 10 || new Set(picks).size !== 10) {
        return json({ error: 'Pick 10 needs exactly 10 different digital downloads' }, 400);
      }
      for (const s of picks) {
        if (!isDigitalSingle(s)) return json({ error: `Not a digital download: ${s}` }, 400);
      }
      picks.forEach(addFree);
    }
    // Referral: code must exist, must not be the buyer's own, and the buyer
    // must not have used this code before. The buyer's +1 is either the
    // picked free item (a $0 line now) or, if they picked nothing, a credit
    // granted when the order is paid (buyer_credit_pending).
    let referral = null;
    if (body.referral_code) {
      const code = String(body.referral_code).trim().toUpperCase();
      const found = await sb(env, `referral_codes?code=eq.${encodeURIComponent(code)}&select=code,owner_email`);
      if (!found.length) return json({ error: 'That referral code does not exist' }, 400);
      const owner = found[0].owner_email.toLowerCase();
      if (owner === email.toLowerCase()) {
        return json({ error: 'You cannot use your own referral code' }, 400);
      }
      const used = await sb(env, `referral_uses?code=eq.${encodeURIComponent(code)}&buyer_email=eq.${encodeURIComponent(email.toLowerCase())}&select=id`);
      if (used.length) return json({ error: 'You have already used this referral code' }, 400);
      let buyerFree = null;
      let buyerCreditPending = false;
      if (body.referral_free) {
        buyerFree = String(body.referral_free).trim();
        if (!isDigitalSingle(buyerFree)) return json({ error: 'The referral free pick must be one of the 10 digital downloads' }, 400);
        addFree(buyerFree);
      } else {
        buyerCreditPending = true;
      }
      referral = { code, buyer_free: buyerFree, buyer_credit_pending: buyerCreditPending };
    }

    const promo = body.promo ? String(body.promo).toUpperCase().trim() : null;
    const discount = promo && PROMOS[promo] ? Math.round(subtotal * PROMOS[promo]) : 0;
    const goodsTotal = subtotal - discount;
    // Digital-only orders: no delivery, no shipping charge.
    let shipping;
    let freeShip;
    if (digitalOnly) {
      shipping = 0;
      freeShip = true;
    } else {
      freeShip = goodsTotal / 100 >= FREE_SHIP[currency];
      const flat = FLAT_SHIPPING[currency];
      shipping = freeShip ? 0 : (flat === null ? null : Math.round(flat * 100));
    }
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
    if (referral) {
      // Recorded pending; the webhook grants it only when the order is paid.
      // A failure here must not lose the order — log and continue.
      try {
        await sb(env, 'referral_uses', {
          method: 'POST',
          body: JSON.stringify({
            code: referral.code, buyer_email: email.toLowerCase(), order_no: no,
            status: 'pending', buyer_credit_pending: referral.buyer_credit_pending,
          }),
        });
      } catch (e) {
        console.error('referral_uses insert failed for order', no, e.message);
      }
    }

    // Step 5: Stripe hosted checkout, only when the secret key is configured.
    // The order stays 'pending' here; the webhook confirms payment later.
    // Only PAID lines go to Stripe ($0 lines are not allowed there).
    if (env.STRIPE_SECRET_KEY) {
      try {
        const session = await createStripeSession(env, { no, email, currency, lines: paidLines, promo, discount, shipping });
        await sb(env, `orders?id=eq.${order.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ payment_provider: 'stripe', payment_ref: session.id }),
        });
        return json({
          order_no: no, currency, subtotal_cents: subtotal, discount_cents: discount,
          shipping_cents: shipping, free_shipping: freeShip, total_cents: total,
          status: 'pending', payment_mode: 'stripe', checkout_url: session.url,
          free_items: freeItems, referral,
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
      free_items: freeItems, referral,
      note: 'Order received. We will email you to confirm and send a secure payment link.',
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
