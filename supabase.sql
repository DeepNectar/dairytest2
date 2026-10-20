-- ============================================================
-- 📖 COMPLETE DIARY — Supabase SQL (full schema, idempotent)
-- Paste this ENTIRE file into Supabase → SQL Editor → Run.
-- Safe to run again anytime: it never drops your existing data.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- 1) USERS (accounts, theme preference) ----------
create table if not exists public.users (
  email    text primary key,               -- stored lowercase
  name     text not null default '',
  hash     text not null default '',       -- password hash from the app
  created  text not null default '',
  theme    text not null default 'light'   -- 'light' | 'dark' (cloud-synced)
);

-- Add new columns to an already-existing users table (no data loss).
alter table public.users add column if not exists theme text not null default 'light';

-- ---------- 2) ENTRIES (one row per diary message / summary block) ----------
create table if not exists public.entries (
  id      bigint not null,                 -- app-generated entry id
  owner   text not null,                   -- user email (lowercase)
  title   text not null default '',
  body    text not null default '',        -- booklet-formatted message text
  mood    text not null default '',
  sender  text not null default '',        -- 'Deep' | 'Chota Don' | …
  heading text not null default '',        -- 📂 one of the 15 diary headings
  date    text not null default '',
  words   integer not null default 0,
  primary key (owner, id)
);

-- For older tables created before the heading feature existed:
alter table public.entries add column if not exists heading text not null default '';

create index if not exists entries_owner_date_idx
  on public.entries (owner, date desc);
create index if not exists entries_owner_heading_idx
  on public.entries (owner, heading);

-- ---------- 3) SETTINGS (book reading position etc.) ----------
create table if not exists public.settings (
  owner text not null,                     -- user email (lowercase)
  key   text not null,                     -- e.g. 'book_page'
  value text not null default '',
  primary key (owner, key)
);

-- ---------- 4) ROW LEVEL SECURITY ----------
-- The app talks to PostgREST with the anon key only, so RLS policies must
-- let anon read/write these tables. (Drop/recreate keeps policies up to date.)
alter table public.users    enable row level security;
alter table public.entries  enable row level security;
alter table public.settings enable row level security;

drop policy if exists "app_users_rw"   on public.users;
drop policy if exists "app_entries_rw" on public.entries;
drop policy if exists "app_settings_rw" on public.settings;

create policy "app_users_rw" on public.users
  for all to anon, authenticated using (true) with check (true);

create policy "app_entries_rw" on public.entries
  for all to anon, authenticated using (true) with check (true);

create policy "app_settings_rw" on public.settings
  for all to anon, authenticated using (true) with check (true);

-- ---------- 5) GRANTS (PostgREST access) ----------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.users    to anon, authenticated;
grant select, insert, update, delete on public.entries  to anon, authenticated;
grant select, insert, update, delete on public.settings to anon, authenticated;

-- Done ✅ — reload the app and sign in; entries will now sync with their
-- 📂 heading under every heading band in the booklet view.
