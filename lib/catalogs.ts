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

// The per-user "Unassigned" system bucket, created lazily the first time an
// item needs a home (e.g. its bucket was deleted). Returns its id.
export async function getOrCreateUnassignedId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("packrite_catalogs")
    .select("id")
    .eq("is_system", true)
    .maybeSingle();
  if (data) return data.id;

  const { data: created, error } = await supabase
    .from("packrite_catalogs")
    .insert({ user_id: userId, name: "Unassigned", is_system: true })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}
