// POST /api/subscribe — Panda Club signup (replaces the browser-only localStorage capture)
// Body: { email }  → stores the subscriber in Supabase and returns the PANDA15 code.
// Digital program: a new member also gets a referral code (PANDA-XXXXXX) on
// signup, returned as referral_code. Existing members keep their code.
import { sb, json, generateReferralCode } from './_lib.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Please enter a valid email' }, 400);
  try {
    await sb(env, 'subscribers', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ email, source: 'website' }),
    });
    // Referral code: reuse the member's existing one, or mint a new one.
    let referralCode = null;
    const existing = await sb(env, `referral_codes?owner_email=eq.${encodeURIComponent(email)}&select=code`).catch(() => []);
    if (existing && existing.length) {
      referralCode = existing[0].code;
    } else {
      for (let attempt = 0; attempt < 8 && !referralCode; attempt++) {
        const code = generateReferralCode();
        const rows = await sb(env, 'referral_codes', {
          method: 'POST',
          headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
          body: JSON.stringify({ code, owner_email: email }),
        }).catch(() => []);
        if (rows && rows.length) referralCode = code;
      }
    }
    return json({ ok: true, code: 'PANDA15', referral_code: referralCode, message: 'You are in! Your 15% off code is PANDA15.' });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
