import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. SERVER ONLY. Used by the background
// catalog worker (called from the DB webhook with no user session) and the
// public share route. Never import this into a client component.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for background cataloging and share links.",
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
