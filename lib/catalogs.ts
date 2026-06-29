import type { SupabaseClient } from "@supabase/supabase-js";
import type { Catalog } from "@/lib/types";

const DEFAULT_NAME = "My Inventory";

// Returns the user's catalogs, creating a default one on first visit so the
// camera always has somewhere to put a capture.
export async function getOrCreateCatalogs(
  supabase: SupabaseClient,
  userId: string,
): Promise<Catalog[]> {
  const { data, error } = await supabase
    .from("packrite_catalogs")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (data && data.length > 0) return data as Catalog[];

  const { data: created, error: insertError } = await supabase
    .from("packrite_catalogs")
    .insert({ user_id: userId, name: DEFAULT_NAME })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return [created as Catalog];
}
