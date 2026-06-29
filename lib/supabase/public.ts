import { createClient } from "@supabase/supabase-js";

// Anon, session-less client for public (logged-out) reads — e.g. the share page.
// Relies on the publishable key + RLS / security-definer functions, NOT the
// service-role key, so sharing works without any admin secret configured.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
