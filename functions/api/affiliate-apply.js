// POST /api/affiliate-apply — Cuppa Panda affiliate program application.
// Body: { name, email, platform, handle, audience, country, pitch }
// Stores one row in affiliate_applications for manual review.
// No code is issued here and nobody is auto-approved: this is an
// application, not a self-serve signup. Run
// supabase/affiliate-migration.sql in the Supabase SQL Editor first.
import { sb, json, validEmail } from './_lib.js';

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase();
  const platform = String(body.platform || '').trim().slice(0, 40);
  const handle = String(body.handle || '').trim().slice(0, 160);
  const country = String(body.country || '').trim().slice(0, 80);
  const pitch = String(body.pitch || '').trim().slice(0, 2000);
  const audience = (body.audience === '' || body.audience == null)
    ? null
    : Math.max(0, parseInt(body.audience, 10) || 0);
  if (!name) return json({ error: 'Please tell us your name' }, 400);
  if (!validEmail(email)) return json({ error: 'A valid email is required' }, 400);
  if (!platform) return json({ error: 'Please choose your main platform' }, 400);
  try {
    const rows = await sb(env, 'affiliate_applications', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({
        name, email, platform,
        handle: handle || null,
        audience_size: audience,
        country: country || null,
        pitch: pitch || null,
        status: 'pending',
      }),
    }).catch(() => []);
    if (!rows || !rows.length) {
      const existing = await sb(env, `affiliate_applications?email=eq.${encodeURIComponent(email)}&select=id`).catch(() => []);
      if (existing && existing.length) {
        return json({ ok: true, duplicate: true, message: 'Thanks — we already have your application and will be in touch.' });
      }
      return json({ error: 'Could not save your application — please try again or email hello@cuppapanda.com.' }, 500);
    }
    return json({ ok: true, message: 'Application received — we review every application by hand and will be in touch within a few days.' });
  } catch (e) {
    const msg = /affiliate_applications/i.test(e.message)
      ? 'Applications are not open yet — please email hello@cuppapanda.com instead.'
      : e.message;
    return json({ error: msg }, 500);
  }
}
