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
  is_system  boolean not null default false, -- the "Unassigned" bucket
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
  cataloged_at  timestamptz, -- set when status -> done (telemetry: catalog time)
  image_path    text,
  status        text not null default 'pending'
                check (status in ('pending', 'processing', 'done', 'error', 'limited')),
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

-- Per-user metadata; country comes from Vercel's IP geolocation header.
create table if not exists public.packrite_user_meta (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  country    text,
  updated_at timestamptz not null default now()
);
alter table public.packrite_user_meta enable row level security;
create policy "packrite_meta_select_own" on public.packrite_user_meta
  for select using (auth.uid() = user_id);
create policy "packrite_meta_insert_own" on public.packrite_user_meta
  for insert with check (auth.uid() = user_id);
create policy "packrite_meta_update_own" on public.packrite_user_meta
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

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

-- ===========================================================================
-- Public share links (no service-role key needed). SECURITY DEFINER functions
-- return only the rows for the supplied share_id — a caller must know the
-- unguessable UUID, and user_id/share_id are never exposed.
-- ===========================================================================
create or replace function public.packrite_shared_catalog(p_share_id uuid)
returns table (id uuid, name text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select c.id, c.name, c.created_at
  from public.packrite_catalogs c
  where c.share_id = p_share_id and c.is_shared = true
$$;

create or replace function public.packrite_shared_items(p_share_id uuid)
returns table (
  id uuid, image_path text, description text, brand text,
  primary_color text, color_hex text, category text, created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select i.id, i.image_path, i.description, i.brand,
         i.primary_color, i.color_hex, i.category, i.created_at
  from public.packrite_catalog_items i
  join public.packrite_catalogs c on c.id = i.catalog_id
  where c.share_id = p_share_id and c.is_shared = true and i.status = 'done'
  order by i.created_at desc
$$;

grant execute on function public.packrite_shared_catalog(uuid) to anon, authenticated;
grant execute on function public.packrite_shared_items(uuid) to anon, authenticated;

-- ===========================================================================
-- Admin telemetry — NO service-role key. SECURITY DEFINER functions run as the
-- owner (can read auth.users + write bans) and enforce admin-only access via the
-- packrite_admins allowlist. Called with the normal logged-in client.
-- Seed your admin email into packrite_admins below.
-- ===========================================================================
create table if not exists public.packrite_admins (email text primary key);
alter table public.packrite_admins enable row level security; -- no policies: API can't read it
-- insert into public.packrite_admins (email) values ('you@example.com') on conflict do nothing;

create or replace function public.packrite_is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.packrite_admins a
    where a.email = (select email from auth.users where id = auth.uid())
  );
$$;

create or replace function public.packrite_admin_overview()
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.packrite_is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'catalogs', (select count(*) from public.packrite_catalogs),
    'users', (
      select coalesce(jsonb_agg(u order by u.created_at desc), '[]'::jsonb)
      from (
        select au.id, au.email,
          -- packrite join date (earliest activity here), NOT the shared auth date
          coalesce(least(cc.first_catalog_at, ic.first_item_at), k.updated_at, au.created_at) as created_at,
          au.last_sign_in_at,
          (au.banned_until is not null and au.banned_until > now()) as banned,
          coalesce(ic.cnt, 0) as items, (k.user_id is not null) as has_key,
          ic.last_item_at, m.country
        from auth.users au
        left join (
          select user_id, count(*) cnt, max(created_at) last_item_at,
                 min(created_at) first_item_at
          from public.packrite_catalog_items group by user_id
        ) ic on ic.user_id = au.id
        left join (
          select user_id, min(created_at) first_catalog_at
          from public.packrite_catalogs group by user_id
        ) cc on cc.user_id = au.id
        left join public.packrite_user_api_keys k on k.user_id = au.id
        left join public.packrite_user_meta m on m.user_id = au.id
        -- shared sandbox: only users who've actually used packrite
        where cc.user_id is not null or ic.cnt is not null or k.user_id is not null
      ) u
    ),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'status', i.status, 'created_at', i.created_at, 'cataloged_at', i.cataloged_at
      )), '[]'::jsonb)
      from public.packrite_catalog_items i
    )
  ) into result;
  return result;
end;
$$;

create or replace function public.packrite_admin_set_blocked(p_target uuid, p_blocked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.packrite_is_admin() then raise exception 'forbidden'; end if;
  if p_target = auth.uid() then raise exception 'cannot modify self'; end if;
  update auth.users set banned_until =
    case when p_blocked then now() + interval '100 years' else null end
    where id = p_target;
end;
$$;

create or replace function public.packrite_admin_delete_user(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.packrite_is_admin() then raise exception 'forbidden'; end if;
  if p_target = auth.uid() then raise exception 'cannot delete self'; end if;
  delete from storage.objects where bucket_id = 'item-photos'
    and (storage.foldername(name))[1] = p_target::text;
  delete from auth.users where id = p_target;
end;
$$;

grant execute on function public.packrite_is_admin() to authenticated;
grant execute on function public.packrite_admin_overview() to authenticated;
grant execute on function public.packrite_admin_set_blocked(uuid, boolean) to authenticated;
grant execute on function public.packrite_admin_delete_user(uuid) to authenticated;

-- Anyone may read (and sign a URL for) a photo that belongs to a shared item.
create policy "packrite_item_photos_shared_read" on storage.objects
  for select using (
    bucket_id = 'item-photos'
    and exists (
      select 1
      from public.packrite_catalog_items i
      join public.packrite_catalogs c on c.id = i.catalog_id
      where i.image_path = name and c.is_shared = true
    )
  );

-- ===========================================================================
-- Free-tier daily cap on the app's shared Anthropic key (ANTHROPIC_API_KEY).
-- BYO-key users are unlimited and never touch this.
-- ===========================================================================
create table if not exists public.packrite_shared_usage (
  user_id    uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  count      int not null default 0,
  primary key (user_id, usage_date)
);
alter table public.packrite_shared_usage enable row level security;
create policy "packrite_shared_usage_select_own" on public.packrite_shared_usage
  for select using (auth.uid() = user_id);

-- Atomically claim one unit of today's (ET) quota; returns true if within limit.
create or replace function public.packrite_use_shared_quota(p_user uuid, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'America/New_York')::date;
  cur int;
begin
  if auth.uid() is not null and p_user <> auth.uid() then raise exception 'forbidden'; end if;
  insert into public.packrite_shared_usage (user_id, usage_date, count)
    values (p_user, today, 1)
    on conflict (user_id, usage_date) do update set count = packrite_shared_usage.count + 1
    returning count into cur;
  return cur <= p_limit;
end;
$$;
grant execute on function public.packrite_use_shared_quota(uuid, int) to authenticated, service_role;

-- ===========================================================================
-- Subscriptions / lifetime free tier (supersedes the per-day packrite_shared_usage
-- objects above). Unlimited = active Stripe sub OR admin grant OR own API key.
-- ===========================================================================
drop function if exists public.packrite_use_shared_quota(uuid, int);
drop table if exists public.packrite_shared_usage;

alter table public.packrite_user_meta add column if not exists region text;

create table if not exists public.packrite_subscriptions (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  plan                   text not null default 'free' check (plan in ('free','unlimited')),
  source                 text not null default 'none' check (source in ('none','stripe','admin')),
  status                 text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  plan_interval          text,
  plan_amount            int,
  plan_currency          text,
  free_used              int not null default 0,
  updated_at             timestamptz not null default now()
);
alter table public.packrite_subscriptions enable row level security;
create policy "packrite_sub_select_own" on public.packrite_subscriptions
  for select using (auth.uid() = user_id);

create or replace function public.packrite_use_free_quota(p_user uuid, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and p_user <> auth.uid() then raise exception 'forbidden'; end if;
  insert into public.packrite_subscriptions (user_id) values (p_user)
    on conflict (user_id) do nothing;
  -- Lazy downgrade: a canceled Stripe sub past its paid period reverts to free
  -- (covers the gap before/without a live cancellation webhook).
  update public.packrite_subscriptions
    set plan = 'free', source = 'none', status = 'canceled',
        cancel_at_period_end = false, updated_at = now()
    where user_id = p_user and source = 'stripe' and cancel_at_period_end
      and current_period_end is not null and current_period_end < now();
  if exists (select 1 from public.packrite_subscriptions s
             where s.user_id = p_user and s.plan = 'unlimited') then
    return true;
  end if;
  update public.packrite_subscriptions set free_used = free_used + 1, updated_at = now()
    where user_id = p_user and free_used < p_limit;
  return found;
end;
$$;
grant execute on function public.packrite_use_free_quota(uuid, int) to authenticated, service_role;

-- Secret-gated writer used by the Stripe webhook + checkout return-flow (no
-- service-role key). p_cancel_at_period_end flags a pending cancellation.
create or replace function public.packrite_apply_subscription(
  p_secret text, p_user uuid, p_active boolean, p_status text,
  p_customer text, p_subscription text, p_period_end timestamptz,
  p_cancel_at_period_end boolean default false,
  p_interval text default null, p_amount int default null, p_currency text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_secret is distinct from
     (select value from public.packrite_app_secrets where name = 'sub_writer') then
    raise exception 'forbidden';
  end if;
  insert into public.packrite_subscriptions
    (user_id, plan, source, status, stripe_customer_id, stripe_subscription_id,
     current_period_end, cancel_at_period_end, plan_interval, plan_amount, plan_currency, updated_at)
  values
    (p_user,
     case when p_active then 'unlimited' else 'free' end,
     case when p_active then 'stripe' else 'none' end,
     p_status, p_customer, p_subscription, p_period_end,
     case when p_active then p_cancel_at_period_end else false end,
     case when p_active then p_interval else null end,
     case when p_active then p_amount   else null end,
     case when p_active then p_currency else null end,
     now())
  on conflict (user_id) do update set
    plan = case when p_active then 'unlimited'
                when public.packrite_subscriptions.source = 'admin' then 'unlimited'
                else 'free' end,
    source = case when p_active then 'stripe'
                  when public.packrite_subscriptions.source = 'admin' then 'admin'
                  else 'none' end,
    status = excluded.status,
    stripe_customer_id = coalesce(excluded.stripe_customer_id,
                                  public.packrite_subscriptions.stripe_customer_id),
    stripe_subscription_id = excluded.stripe_subscription_id,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = case when p_active then p_cancel_at_period_end else false end,
    plan_interval = case when p_active then p_interval else null end,
    plan_amount   = case when p_active then p_amount   else null end,
    plan_currency = case when p_active then p_currency else null end,
    updated_at = now();
end;
$$;
grant execute on function public.packrite_apply_subscription(
  text, uuid, boolean, text, text, text, timestamptz, boolean, text, int, text
) to anon, authenticated, service_role;

create or replace function public.packrite_admin_set_plan(p_target uuid, p_unlimited boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.packrite_is_admin() then raise exception 'forbidden'; end if;
  insert into public.packrite_subscriptions (user_id, plan, source)
    values (p_target,
            case when p_unlimited then 'unlimited' else 'free' end,
            case when p_unlimited then 'admin' else 'none' end)
    on conflict (user_id) do update set
      plan = case when p_unlimited then 'unlimited' else 'free' end,
      source = case when p_unlimited then 'admin' else 'none' end,
      updated_at = now();
end;
$$;
grant execute on function public.packrite_admin_set_plan(uuid, boolean) to authenticated;
