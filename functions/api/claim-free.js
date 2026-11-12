// POST /api/claim-free — the Panda Club member gift: 1 free download.
// Body: { email, sku }  → { url, via, expires_in } (a time-limited download link)
// Rules (Joh, 2026-11-11): email-gated, one per member ever. The email must
// be a Panda Club subscriber, the sku must be one of the 10 digital singles,
// and the member must not have claimed before. The one-per-member rule is
// enforced by the partial unique index credit_ledger_member_join_once as
// well as this check, so a double claim can never slip through.
import { sb, json, validEmail, isDigitalSingle, grantCredit } from './_lib.js';
import { signedDownloadUrl } from './_download.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const email = String(body.email || '').trim().toLowerCase();
  const sku = String(body.sku || '').trim();
  if (!validEmail(email)) return json({ error: 'A valid email is required' }, 400);
  if (!isDigitalSingle(sku)) return json({ error: 'Pick one of the 10 digital downloads' }, 400);
  try {
    const subs = await sb(env, `subscribers?email=eq.${encodeURIComponent(email)}&select=email`);
    if (!subs.length) {
      return json({ error: 'Join the Panda Club first — the free download is for members.' }, 403);
    }
    const claimed = await sb(env, `credit_ledger?email=eq.${encodeURIComponent(email)}&source=eq.member_join&select=id`);
    if (claimed.length) {
      return json({ error: 'You have already used your one free member download.' }, 409);
    }
    // Grant the gift (+1) and spend it on this sku (-1) in one go. If two
    // claims race, the unique index rejects the second insert (409).
    try {
      await grantCredit(env, email, 1, 'member_join', sku);
    } catch (e) {
      if (/duplicate|unique|409/i.test(e.message)) {
        return json({ error: 'You have already used your one free member download.' }, 409);
      }
      throw e;
    }
    await grantCredit(env, email, -1, 'redeem', sku);
    const link = await signedDownloadUrl(env, sku);
    return json({ ok: true, sku, ...link });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
