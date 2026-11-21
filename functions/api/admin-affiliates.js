// POST /api/admin-affiliates — affiliate applications for the admins.
// Body: { passcode }  →  { stats, applications: [{ id, name, email,
//   platform, handle, audience_size, country, pitch, status, code,
//   created_at, reviewed_at }] } newest first, limit 50.
// Body: { passcode, id, action: 'approve'|'reject' }  →  updates that
// application's status (+ reviewed_at) and returns the updated row.
// Approving only marks it approved: the personal code is set by hand
// afterwards (see supabase/affiliate-migration.sql) — no code is minted
// here, and nobody is auto-approved. If the affiliate_applications table
// does not exist yet (migration not run), the list reports table_missing
// instead of erroring.
// Same ADMIN_PASSCODE gate as /api/admin-orders (see that file). The page
// that calls this is /admin.html (noindex, linked from nowhere).
import { sb, json } from './_lib.js';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSCODE) {
    return json({ error: 'Admin access is not configured yet' }, 500);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (String(body.passcode || '') !== env.ADMIN_PASSCODE) {
    return json({ error: 'Wrong passcode' }, 401);
  }
  try {
    if (body.action === 'approve' || body.action === 'reject') {
      const id = Number(body.id);
      if (!Number.isFinite(id)) return json({ error: 'Bad application id' }, 400);
      const status = body.action === 'approve' ? 'approved' : 'rejected';
      const rows = await sb(env, `affiliate_applications?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status, reviewed_at: new Date().toISOString() }),
      });
      return json({ ok: true, application: rows && rows[0] ? rows[0] : null });
    }
    let apps;
    try {
      apps = await sb(env,
        `affiliate_applications?select=id,name,email,platform,handle,audience_size,country,pitch,status,code,created_at,reviewed_at&order=created_at.desc&limit=50`);
    } catch (e) {
      if (/affiliate_applications/i.test(e.message)) {
        return json({
          table_missing: true,
          stats: { total: 0, pending: 0, approved: 0, rejected: 0 },
          applications: [],
        });
      }
      throw e;
    }
    return json({
      stats: {
        total: apps.length,
        pending: apps.filter(a => a.status === 'pending').length,
        approved: apps.filter(a => a.status === 'approved').length,
        rejected: apps.filter(a => a.status === 'rejected').length,
      },
      applications: apps,
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
