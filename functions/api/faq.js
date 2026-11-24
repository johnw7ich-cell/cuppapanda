// GET  /api/faq        → the approved FAQ list (used by the website bot widget)
// POST /api/faq { q }  → keyword-matched approved answer, or a human-handoff reply.
// Rule-based on purpose: fixed approved answers, $0 running cost, no invented policies.
// NOTE: shipping policy confirmed by Joh 2026-11-23 — delivery 10–15 days to
// all countries; UK & Ireland FREE shipping; everywhere else +$10 flat.
// This replaced the old matrix (UK 5–10 / IE-EU 7–12 working days, free over
// £35/€40/$45) and the PDP's 3–5 days line.
import { json } from './_lib.js';

const FAQS = [
  { id: 'delivery-time', keys: ['deliver', 'shipping time', 'how long', 'arrive', 'postage time'],
    q: 'How long does delivery take?',
    a: 'Delivery takes 10–15 days to all countries. Merch is made to order first, then shipped. We ship worldwide.' },
  { id: 'free-delivery', keys: ['free delivery', 'free shipping', 'postage cost', 'shipping cost', 'delivery cost'],
    q: 'How much is delivery?',
    a: 'UK & Ireland: FREE shipping. Everywhere else: +$10 flat shipping (£7.50 / €8.60).' },
  { id: 'blind-box-returns', keys: ['opened blind', 'open blind box', 'opened'],
    q: 'Can I return an opened blind box?',
    a: 'Opened blind boxes are final sale. Unopened items follow our normal 14-day returns.' },
  { id: 'returns', keys: ['return', 'refund', 'exchange', 'send back'],
    q: 'Can I return something?',
    a: '14-day returns on unused physical items. Digital products cannot be refunded — downloads are delivered instantly. Email hello@cuppapanda.com and we will sort it out. (Refunds are handled by a human, not the bot.)' },
  { id: 'blind-box', keys: ['blind box', 'surprise', 'which design', 'specific design', 'choose design', 'secret'],
    q: 'How do blind boxes work?',
    a: 'Each blind box is a surprise: every series has 6–8 designs plus 1 secret rare. We cannot guarantee a specific design — that is the fun of it! Got a double? Trade with friends.' },
  { id: 'panda-club', keys: ['panda club', 'discount', 'promo', 'code', '15%', 'offer', 'newsletter'],
    q: 'What is the Panda Club?',
    a: 'Join the Panda Club on our homepage for 15% off your first order with code PANDA15, plus first looks at new Friday drops.' },
  { id: 'payment', keys: ['pay', 'payment', 'card', 'checkout'],
    q: 'How do I pay?',
    a: 'Place your order and pay securely with Stripe checkout (card). Once payment is confirmed we email you your order confirmation with your download links.' },
  { id: 'merch-timing', keys: ['made to order', 'merch', 'hoodie', 'print'],
    q: 'Why does merch take longer?',
    a: 'Merch is made to order — printed just for you — which takes 5–10 working days to make; total delivery is 10–15 days.' },
  { id: 'contact', keys: ['contact', 'email', 'human', 'help', 'talk to'],
    q: 'How can I contact you?',
    a: 'Email us anytime at hello@cuppapanda.com — a human (Cuppa Panda\u2019s dad) reads every message.' },
];

const HANDOFF = {
  matched: false,
  a: 'I can only answer our common questions. For refunds, address changes, payment issues or anything else, please email hello@cuppapanda.com and a human will help you.',
};

export async function onRequestGet() {
  return json({ faqs: FAQS.map(({ id, q, a }) => ({ id, q, a })) });
}

export async function onRequestPost({ request }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const q = String(body.q || '').toLowerCase();
  const hit = FAQS.find(f => f.keys.some(k => q.includes(k)));
  if (!hit) return json(HANDOFF);
  return json({ matched: true, id: hit.id, q: hit.q, a: hit.a });
}
