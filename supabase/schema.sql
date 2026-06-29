-- packrite (Day 28) — multi-tenant packing catalog
-- Run this in the Supabase SQL editor (or via the CLI) on a fresh project.
-- All objects are prefixed `packrite_` so they can share the 100-day sandbox.
--
-- DASHBOARD CONFIG (not expressible as SQL):
--   1. Authentication -> Providers -> enable Email and Google.
--      For Google, set the OAuth client + add redirect:
--        https://<your-domain>/auth/callback  (and http://localhost:3000/auth/callback for dev)
--   2. Authentication -> Providers -> Email -> turn OFF "Confirm email"
--      (so signup -> login is instant; password reset still emails).
--   3. Database -> Webhooks -> create a webhook on packrite_catalog_items:
--        events: INSERT, method: POST, url: https://<your-domain>/api/catalog,
--        HTTP header: x-webhook-secret = <CATALOG_WEBHOOK_SECRET from .env.local>
--      (Webhooks can't reach localhost; in dev the client + reconciler drive processing.)

-- ===========================================================================
-- Tables
-- ===========================================================================

-- A user can own multiple catalogs. share_id is the unguessable secret behind
-- public read-only share links; is_shared gates whether the link works.
create table if not exists public.packrite_catalogs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null default 'My Inventory',
  share_id   uuid not null default gen_random_uuid(),
  is_shared  boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists packrite_catalogs_share_id_key on public.packrite_catalogs (share_id);
create index if not exists packrite_catalogs_user_id_idx on public.packrite_catalogs (user_id);

-- One row per captured item. image_path is the Storage object path (NOT a URL);
-- short-lived signed URLs are minted on read since the bucket is private.
-- status: pending -> processing -> done | error (processing = claimed by a worker).
create table if not exists public.packrite_catalog_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  catalog_id    uuid not null references public.packrite_catalogs (id) on delete cascade,
  created_at    timestamptz not null default now(),
  image_path    text,
  status        text not null default 'pending'
                check (status in ('pending', 'processing', 'done', 'error')),
  description   text,
  brand         text,
  primary_color text,
  color_hex     text,
  category      text
);
create index if not exists packrite_catalog_items_user_id_idx on public.packrite_catalog_items (user_id);
create index if not exists packrite_catalog_items_catalog_id_idx on public.packrite_catalog_items (catalog_id);
create index if not exists packrite_catalog_items_status_idx on public.packrite_catalog_items (status);

-- Per-user encrypted Anthropic key. Only ciphertext/iv/auth_tag are stored;
-- key_hint is a non-sensitive masked preview (e.g. sk-ant-...4f2a) for the UI.
create table if not exists public.packrite_user_api_keys (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  ciphertext text not null,
  iv         text not null,
  auth_tag   text not null,
  key_hint   text,
  updated_at timestamptz not null default now()
);

-- ===========================================================================
-- Row Level Security: every user can only touch their own rows.
-- The server's service-role client bypasses RLS for the webhook + share routes.
-- ===========================================================================

alter table public.packrite_catalogs      enable row level security;
alter table public.packrite_catalog_items enable row level security;
alter table public.packrite_user_api_keys enable row level security;

create policy "packrite_catalogs_select_own" on public.packrite_catalogs
  for select using (auth.uid() = user_id);
create policy "packrite_catalogs_insert_own" on public.packrite_catalogs
  for insert with check (auth.uid() = user_id);
create policy "packrite_catalogs_update_own" on public.packrite_catalogs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "packrite_catalogs_delete_own" on public.packrite_catalogs
  for delete using (auth.uid() = user_id);

create policy "packrite_items_select_own" on public.packrite_catalog_items
  for select using (auth.uid() = user_id);
create policy "packrite_items_insert_own" on public.packrite_catalog_items
  for insert with check (auth.uid() = user_id);
create policy "packrite_items_update_own" on public.packrite_catalog_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "packrite_items_delete_own" on public.packrite_catalog_items
  for delete using (auth.uid() = user_id);

create policy "packrite_keys_select_own" on public.packrite_user_api_keys
  for select using (auth.uid() = user_id);
create policy "packrite_keys_insert_own" on public.packrite_user_api_keys
  for insert with check (auth.uid() = user_id);
create policy "packrite_keys_update_own" on public.packrite_user_api_keys
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "packrite_keys_delete_own" on public.packrite_user_api_keys
  for delete using (auth.uid() = user_id);

-- ===========================================================================
-- Realtime: cards fill themselves in as the background job finishes.
-- REPLICA IDENTITY FULL so RLS can authorize UPDATE/DELETE events.
-- ===========================================================================
alter table public.packrite_catalog_items replica identity full;
alter publication supabase_realtime add table public.packrite_catalog_items;

-- ===========================================================================
-- Storage: private bucket, per-user folder (item-photos/{user_id}/{file}).
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', false)
on conflict (id) do nothing;

create policy "packrite_item_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "packrite_item_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "packrite_item_photos_update_own" on storage.objects
  for update using (
    bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "packrite_item_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
