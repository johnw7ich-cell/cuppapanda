// Shared helpers for Cuppa Panda API functions (Cloudflare Pages Functions).
// Env vars required (set in Cloudflare Pages project settings, never in code):
//   SUPABASE_URL               e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  service-role key (server only; bypasses RLS)

export const RATES = { GBP: 0.75, EUR: 0.86, USD: 1 };
export const FREE_SHIP = { GBP: 35, EUR: 40, USD: 45 }; // free delivery thresholds (site policy)
// Flat shipping below threshold: null = "confirmed by email" (current shop practice).
// Set a number per currency here when Joh confirms a flat fee.
export const FLAT_SHIPPING = { GBP: null, EUR: null, USD: null };
export const PROMOS = { PANDA15: 0.15 }; // Panda Club: 15% off first order

// Shop charm-pricing rule, applied server-side so browser prices are never trusted.
export function unitCents(usdBase, currency) {
  const rate = RATES[currency] ?? 1;
  const unit = Math.floor(usdBase * rate) + 0.99;
  return Math.round(unit * 100);
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function sb(env, path, options = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)');
  }
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 300)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export function orderNo() {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CP-${ymd}-${rand}`;
}
