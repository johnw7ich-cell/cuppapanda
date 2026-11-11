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

// Digital program (Series 1, 2026-11-11): the 10 digital singles + the bundle.
// Customer prices are $5 a single / $10 Pick 10 (usd_base 4.99 / 9.99 —
// the charm rule makes them display as $4.99 / $9.99 in USD).
export const DIGITAL_BUNDLE = 'digital-pick-10';
export const DIGITAL_SINGLES = [
  'digital-panda-desk-journal', 'digital-adhd-focus-planner', 'digital-calm-workbook',
  'digital-student-planner', 'digital-habit-tracker', 'digital-sticker-pack',
  'digital-notion-template', 'digital-junk-journal-kit', 'digital-colouring-pages',
  'digital-desk-poster-set',
];
export const isDigitalSingle = sku => DIGITAL_SINGLES.includes(sku);

// Referral codes look like PANDA-K7Q2M9 (no 0/O/1/I/L, so they read cleanly
// in a screenshot or a text message).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generateReferralCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = 'PANDA-';
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

export const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());

// Credit ledger: every grant/redeem is an auditable row, and download_credits
// holds the spendable balance. This is read-modify-write (no atomic increment
// over PostgREST); at this shop's volume that is fine, and the ledger is the
// source of truth if a balance ever needs rebuilding.
export async function grantCredit(env, email, delta, source, ref) {
  const rows = await sb(env, `download_credits?email=eq.${encodeURIComponent(email)}&select=email,balance`);
  const balance = (rows[0] ? rows[0].balance : 0) + delta;
  if (balance < 0) throw new Error('Not enough download credits');
  await sb(env, 'download_credits', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ email, balance, updated_at: new Date().toISOString() }),
  });
  await sb(env, 'credit_ledger', {
    method: 'POST',
    body: JSON.stringify({ email, delta, source, ref: ref || null }),
  });
  return balance;
}

export async function getBalance(env, email) {
  const rows = await sb(env, `download_credits?email=eq.${encodeURIComponent(email)}&select=balance`);
  return rows[0] ? rows[0].balance : 0;
}

export function orderNo() {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CP-${ymd}-${rand}`;
}
