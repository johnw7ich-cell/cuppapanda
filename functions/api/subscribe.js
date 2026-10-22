// POST /api/subscribe — Panda Club signup (replaces the browser-only localStorage capture)
// Body: { email }  → stores the subscriber in Supabase and returns the PANDA15 code.
import { sb, json } from './_lib.js';

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
    return json({ ok: true, code: 'PANDA15', message: 'You are in! Your 15% off code is PANDA15.' });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
