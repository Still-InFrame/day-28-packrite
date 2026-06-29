# packrite

**Live:** https://packrite.100dayaichallenge.com

**Snap, catalog, pack.** A mobile-first web app for cataloging items while you pack. Point your phone at an item, tap the shutter, approve the photo, and keep going — packrite identifies and describes everything in the background with Claude, so you never wait on the AI.

Day 28 of Savion's 100 Day AI Build Challenge.

## What it does

- **Snap-and-move-on capture.** A full-screen camera with one big shutter. Capture → confirm (Keep / Retake) → straight back to the camera. The upload and AI cataloging happen entirely in the background.
- **Hands-free auto-capture.** Flip on Auto and just hold each item up — a motion-settle detector snaps it the moment you hold it still, saves automatically, and offers a 3-second Undo. No ML model, works for any item including clothing.
- **AI cataloging, zero setup.** Each captured photo is sent to Claude (server-side), which returns a description, brand, primary color + hex swatch, and category. Cards fill themselves in live. Works out of the box on a shared key — **30 free catalogs** per user.
- **Unlimited via subscription or your own key.** After the free 30, users upgrade to an unlimited plan (Stripe — $0.99/mo or $10/yr) or paste their own Anthropic key (encrypted AES-256-GCM, never sent to the browser, masked preview). Admins can also grant unlimited from the dashboard.
- **Multiple catalogs.** Organize captures into separate buckets (e.g. "Carry-on", "Garage", "For sale"), switch the active one before you snap, and rename or delete buckets. Deleting a bucket never loses items — they fall into an "Unassigned" bucket.
- **Move & bulk actions.** Move any item to another bucket, or multi-select to move or delete many at once.
- **Live inventory with filters.** A realtime grid you can search and filter by category and status. Brand and description are editable inline; delete an item from its card menu.
- **Shareable, read-only links.** Flip a catalog to public and share an unguessable link — viewers see a clean read-only gallery, no sign-in. Rotate the link any time to revoke access.
- **Durable background pipeline.** Cataloging is driven by a Supabase Database Webhook (browser-independent), a best-effort client trigger, and a reconciler that re-queues anything that slipped through — so a closed tab never leaves an item stuck.

## Screenshot

![screenshot](./public/screenshot.png)

## Stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind v4**
- **Supabase** — Auth (Google + email/password), Postgres with Row Level Security, private Storage
- **Anthropic** `@anthropic-ai/sdk` — `claude-sonnet-4-6` vision, server-side only
- **react-webcam** for live capture
- Node `crypto` (AES-256-GCM) for per-user API key encryption

## Install

```bash
git clone https://github.com/Still-InFrame/day-28-packrite.git
cd day-28-packrite
npm install
```

### 1. Supabase

1. Create a Supabase project (or reuse one).
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL editor. It creates the
   `packrite_*` tables, RLS policies, the private `item-photos` bucket + storage policies,
   and enables Realtime.
3. **Authentication → Providers:** enable **Email** and **Google**. For Google, set the OAuth
   client and add the redirect `https://<your-domain>/auth/callback` (and
   `http://localhost:3000/auth/callback` for local dev).
4. **Authentication → Providers → Email:** turn **off** "Confirm email" so signup → login is
   instant (the forgot-password flow still emails a recovery link).

### 2. Environment

Copy `.env.local.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # Settings → API → Publishable key
APP_ENCRYPTION_KEY=...                      # 32 random bytes, base64:  openssl rand -base64 32
CATALOG_WEBHOOK_SECRET=...                  # any random string:        openssl rand -hex 24
ADMIN_EMAIL=you@example.com                 # for the /admin telemetry dashboard
ANTHROPIC_API_KEY=...                        # shared key for the free tier (30/day/user)
SUPABASE_SERVICE_ROLE_KEY=                  # OPTIONAL — only the prod webhook uses it
```

Capture, cataloging, sharing, and the admin dashboard all work **without** the service-role key —
sharing and admin telemetry run through `SECURITY DEFINER` functions, not a god-mode key. The
service-role key is only needed if you wire up the production DB webhook. For the admin dashboard,
also add your email to the `packrite_admins` table (see `supabase/schema.sql`). Server-only values
never reach the browser.

### 3. Background cataloging webhook (production)

In **Database → Webhooks**, create a webhook on `packrite_catalog_items`:

- Events: **INSERT**, Method: **POST**
- URL: `https://<your-domain>/api/catalog`
- HTTP header: `x-webhook-secret` = your `CATALOG_WEBHOOK_SECRET`

Webhooks can't reach `localhost`, so in local dev cataloging is driven by the in-app client
trigger and the reconciler instead — no webhook needed to develop.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000, sign in, paste your Anthropic API key on the Settings page, and
start snapping.

## Links

- Tracker: https://www.100dayaichallenge.com/share/savion
