import { createClient } from "@/lib/supabase/server";

// Returns the logged-in user only if they're the configured admin, else null.
// Used to gate the telemetry dashboard and admin API routes.
export async function getAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email?.trim().toLowerCase() !== adminEmail) return null;
  return user;
}
