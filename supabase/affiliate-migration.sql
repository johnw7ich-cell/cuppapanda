-- Cuppa Panda — affiliate program applications
-- Run in the Supabase SQL Editor for the "cuppapanda" project
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Creates affiliate_applications. This is NOT a self-serve platform:
-- applications are reviewed by hand, and the personal code is set only
-- on approval. No code is issued by the application form.
--
-- RLS is ON with NO policies: only the service-role key (used by the
-- Cloudflare Pages Functions) can read/write this table, exactly like
-- orders / referral tables today. Browsers never see this data.

create table if not exists public.affiliate_applications (
  id            bigint generated always as identity primary key,
  name          text not null,
  email         text not null unique,           -- one application per email
  platform      text not null,                  -- Instagram / TikTok / YouTube / Blog / Other
  handle        text,                           -- @handle or channel / blog URL
  audience_size integer,                        -- followers / subscribers, if shared
  country       text,
  pitch         text,                           -- how they will share Cuppa Panda
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  code          text,                           -- personal PANDA-XXXXXX code, set on approval
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);
create index if not exists affiliate_applications_status_idx
  on public.affiliate_applications(status);

alter table public.affiliate_applications enable row level security;
-- No policies: service-role key only (Cloudflare Functions).
