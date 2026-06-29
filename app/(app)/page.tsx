import { createClient } from "@/lib/supabase/server";
import { getOrCreateCatalogs } from "@/lib/catalogs";
import { Camera } from "@/components/Camera";

export default async function CapturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const catalogs = await getOrCreateCatalogs(supabase, user!.id);

  return <Camera catalogs={catalogs} userId={user!.id} />;
}
