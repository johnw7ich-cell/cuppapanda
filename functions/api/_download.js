// Shared download delivery for Cuppa Panda digital products.
// Route: R2 first (Cloudflare R2 bucket, binding env.DIGITAL_DOWNLOADS),
// Supabase Storage fallback (bucket 'digital-downloads') if no R2 binding.
// If neither is configured, signedDownloadUrl throws a plain-English error
// telling the operator exactly what is missing — the API returns that as a
// 500 with the setup hint, never a bare failure.
//
// R2 setup (Joh, Cloudflare dashboard, account 'Nijellyies' — the account
// that owns the cuppapanda.com zone and the cuppapanda-web Pages project):
//   1. R2 -> Create bucket -> name: cuppapanda-digital
//   2. Upload the 10 sample PDFs into it, object keys exactly as below
//      (digital/<slug>.pdf). R2 free tier: 10 GB storage, zero egress fees.
//   3. Pages project cuppapanda-web -> Settings -> Functions -> R2 bucket
//      bindings -> Add binding: variable name DIGITAL_DOWNLOADS, bucket
//      cuppapanda-digital. Then re-deploy (any push to the repo redeploys).
// Supabase Storage fallback (no R2 needed):
//   1. Supabase Dashboard -> Storage -> Create bucket -> name:
//      digital-downloads, Private (not public).
//   2. Upload the same 10 PDFs with the same keys. The service-role key the
//      Functions already use can sign URLs for a private bucket, so no
//      storage policy change is needed.
import { sb } from './_lib.js';

// sku -> R2 / Storage object key. The files are the Series 1 free samples
// today; when the full products are built they replace these files under
// the SAME keys, so no code change is needed then.
export const DIGITAL_FILES = {
  'digital-panda-desk-journal': { key: 'digital/panda-desk-journal.pdf', file: 'panda-desk-journal-free-sample-5pages.pdf' },
  'digital-adhd-focus-planner': { key: 'digital/adhd-focus-planner.pdf', file: 'adhd-focus-planner-free-sample-5pages.pdf' },
  'digital-calm-workbook': { key: 'digital/calm-workbook.pdf', file: 'calm-workbook-free-sample-5pages.pdf' },
  'digital-student-planner': { key: 'digital/student-planner.pdf', file: 'student-planner-free-sample.pdf' },
  'digital-habit-tracker': { key: 'digital/habit-tracker.pdf', file: 'habit-tracker-free-sample.pdf' },
  'digital-sticker-pack': { key: 'digital/digital-sticker-pack.pdf', file: 'digital-sticker-pack-free-sample.pdf' },
  'digital-notion-template': { key: 'digital/notion-template.pdf', file: 'notion-template-preview.pdf' },
  'digital-junk-journal-kit': { key: 'digital/junk-journal-kit.pdf', file: 'junk-journal-kit-free-sample.pdf' },
  'digital-colouring-pages': { key: 'digital/colouring-pages.pdf', file: 'colouring-pages-free-sample.pdf' },
  'digital-desk-poster-set': { key: 'digital/desk-poster-set.pdf', file: 'desk-poster-set-free-sample.pdf' },
};

const URL_TTL_SECONDS = 3600; // download links work for 1 hour

async function r2SignedUrl(env, key) {
  if (!env.DIGITAL_DOWNLOADS) return null;
  // R2Bucket.createSignedUrl is the Workers-native way to make a
  // time-limited link. It throws if the object does not exist.
  return env.DIGITAL_DOWNLOADS.createSignedUrl(key, { expiresIn: URL_TTL_SECONDS });
}

async function supabaseSignedUrl(env, key) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const res = await fetch(
    `${env.SUPABASE_URL}/storage/v1/object/sign/digital-downloads/${key}`,
    {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ expiresIn: URL_TTL_SECONDS }),
    },
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  if (!data.signedURL) return null;
  return `${env.SUPABASE_URL}/storage/v1${data.signedURL}`;
}

// Returns { url, via: 'r2' | 'supabase-storage', expires_in }.
// Throws a setup error (message is safe to show the operator) when no
// delivery backend is configured or the file is not uploaded yet.
export async function signedDownloadUrl(env, sku) {
  const entry = DIGITAL_FILES[sku];
  if (!entry) throw new Error(`No downloadable file for ${sku}`);
  const r2 = await r2SignedUrl(env, entry.key).catch(() => null);
  if (r2) return { url: r2, via: 'r2', expires_in: URL_TTL_SECONDS };
  const supa = await supabaseSignedUrl(env, entry.key).catch(() => null);
  if (supa) return { url: supa, via: 'supabase-storage', expires_in: URL_TTL_SECONDS };
  if (!env.DIGITAL_DOWNLOADS) {
    throw new Error(
      'Download delivery is not set up yet: create the R2 bucket cuppapanda-digital, ' +
      'upload the PDFs, and bind it as DIGITAL_DOWNLOADS (or create the Supabase Storage ' +
      'bucket digital-downloads instead). See functions/api/_download.js for the steps.',
    );
  }
  throw new Error(`File not uploaded yet: ${entry.key} is missing from the cuppapanda-digital R2 bucket.`);
}
