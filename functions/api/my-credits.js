// GET /api/my-credits?email=... — a member's referral dashboard in one call.
// Returns: is_member, download-credit balance, their referral code (if any),
// granted referral count, and milestone rewards owed. Used by the homepage
// member box and by support when a member asks "where is my free download?".
// Email-only lookup: nothing here exposes another member's data.
import { sb, json, validEmail } from './_lib.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const email = String(url.searchParams.get('email') || '').trim().toLowerCase();
  if (!validEmail(email)) return json({ error: 'A valid email is required' }, 400);
  try {
    const subs = await sb(env, `subscribers?email=eq.${encodeURIComponent(email)}&select=email`);
    const balanceRows = await sb(env, `download_credits?email=eq.${encodeURIComponent(email)}&select=balance`);
    const codes = await sb(env, `referral_codes?owner_email=eq.${encodeURIComponent(email)}&select=code,uses_count,created_at`);
    const code = codes[0] || null;
    let granted = 0;
    let milestones = [];
    if (code) {
      const uses = await sb(env, `referral_uses?code=eq.${encodeURIComponent(code.code)}&status=eq.granted&select=id`);
      granted = uses.length;
      milestones = await sb(env, `referral_milestones?code=eq.${encodeURIComponent(code.code)}&select=milestone,reward,granted_at`);
    }
    const claimed = await sb(env, `credit_ledger?email=eq.${encodeURIComponent(email)}&source=eq.member_join&select=id`);
    return json({
      email,
      is_member: subs.length > 0,
      credits: balanceRows[0] ? balanceRows[0].balance : 0,
      free_claim_used: claimed.length > 0,
      referral_code: code ? code.code : null,
      referrals_granted: granted,
      milestones,
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
