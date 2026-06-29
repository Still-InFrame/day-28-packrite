import { createClient } from "@/lib/supabase/server";
import { getOrCreateCatalogs } from "@/lib/catalogs";
import { CatalogView } from "@/components/CatalogView";
import type { CatalogItem } from "@/lib/types";

export default async function CatalogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const catalogs = await getOrCreateCatalogs(supabase, user!.id);

  const { data: items } = await supabase
    .from("packrite_catalog_items")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <CatalogView
      initialItems={(items as CatalogItem[]) ?? []}
      catalogs={catalogs}
      userId={user!.id}
    />
  );
}
