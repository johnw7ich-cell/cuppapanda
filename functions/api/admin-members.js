// POST /api/admin-members — Panda Club membership overview for the admins.
// Body: { passcode }  →  { stats, members: [{ email, source, created_at,
//   unsubscribed_at, referral_code, uses_count, referrals_granted, credits,
//   free_claim_used, milestones: [{ milestone, reward }] }] } newest first.
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
    const subs = await sb(env,
      `subscribers?select=email,source,created_at,unsubscribed_at&order=created_at.desc&limit=100`);
    const codes = await sb(env,
      `referral_codes?select=code,owner_email,uses_count&limit=500`).catch(() => []);
    const grantedUses = await sb(env,
      `referral_uses?status=eq.granted&select=code&limit=1000`).catch(() => []);
    const credits = await sb(env,
      `download_credits?select=email,balance&limit=500`).catch(() => []);
    const claims = await sb(env,
      `credit_ledger?source=eq.member_join&select=email&limit=1000`).catch(() => []);
    const milestones = await sb(env,
      `referral_milestones?select=code,milestone,reward&limit=500`).catch(() => []);
    const codeByOwner = Object.fromEntries((codes || []).map(c => [c.owner_email, c]));
    const grantedByCode = {};
    (grantedUses || []).forEach(u => { grantedByCode[u.code] = (grantedByCode[u.code] || 0) + 1; });
    const creditByEmail = Object.fromEntries((credits || []).map(c => [c.email, c.balance]));
    const claimedSet = new Set((claims || []).map(c => c.email));
    const milesByCode = {};
    (milestones || []).forEach(m => {
      (milesByCode[m.code] = milesByCode[m.code] || []).push({ milestone: m.milestone, reward: m.reward });
    });
    const members = (subs || []).map(s => {
      const code = codeByOwner[s.email] || null;
      return {
        email: s.email,
        source: s.source,
        created_at: s.created_at,
        unsubscribed_at: s.unsubscribed_at || null,
        referral_code: code ? code.code : null,
        uses_count: code ? code.uses_count : 0,
        referrals_granted: code ? (grantedByCode[code.code] || 0) : 0,
        credits: creditByEmail[s.email] || 0,
        free_claim_used: claimedSet.has(s.email),
        milestones: code ? (milesByCode[code.code] || []) : [],
      };
    });
    return json({
      stats: {
        members: members.length,
        codes: (codes || []).length,
        referrals_granted: (grantedUses || []).length,
        free_claims_used: claimedSet.size,
      },
      members,
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
