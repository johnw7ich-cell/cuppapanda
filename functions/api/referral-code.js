// POST /api/referral-code — get (or create) a Panda Club member's referral code.
// Body: { email }  → { code }  (one code per member, stable across calls)
// A code only exists for members: the email must be a Panda Club subscriber
// (join at /#club first). Codes are PANDA-XXXXXX; collisions are retried.
import { sb, json, generateReferralCode, validEmail } from './_lib.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const email = String(body.email || '').trim().toLowerCase();
  if (!validEmail(email)) return json({ error: 'A valid email is required' }, 400);
  try {
    const subs = await sb(env, `subscribers?email=eq.${encodeURIComponent(email)}&select=email`);
    if (!subs.length) {
      return json({ error: 'Join the Panda Club first — referral codes are for members.' }, 403);
    }
    const existing = await sb(env, `referral_codes?owner_email=eq.${encodeURIComponent(email)}&select=code`);
    if (existing.length) return json({ code: existing[0].code, email });
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateReferralCode();
      const rows = await sb(env, 'referral_codes', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify({ code, owner_email: email }),
      }).catch(() => []);
      if (rows && rows.length) return json({ code, email });
    }
    return json({ error: 'Could not generate a code — please try again' }, 500);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
