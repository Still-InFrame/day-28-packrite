import { createClient } from "@/lib/supabase/server";
import { getOrCreateCatalogs } from "@/lib/catalogs";
import { Camera } from "@/components/Camera";

export default async function CapturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const catalogs = await getOrCreateCatalogs(supabase, user!.id);

  const { data: keyRow } = await supabase
    .from("packrite_user_api_keys")
    .select("user_id")
    .maybeSingle();

  return (
    <Camera catalogs={catalogs} userId={user!.id} hasKey={Boolean(keyRow)} />
  );
}
