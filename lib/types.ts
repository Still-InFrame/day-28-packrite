// Shared domain types, kept in sync with the packrite_* tables.

export type ItemStatus =
  | "pending"
  | "processing"
  | "done"
  | "error"
  | "limited";

export interface CatalogItem {
  id: string;
  user_id: string;
  catalog_id: string;
  created_at: string;
  image_path: string | null;
  status: ItemStatus;
  description: string | null;
  brand: string | null;
  primary_color: string | null;
  color_hex: string | null;
  category: string | null;
}

export interface Catalog {
  id: string;
  user_id: string;
  name: string;
  share_id: string;
  is_shared: boolean;
  is_system: boolean; // the "Unassigned" bucket — not renamable/deletable
  created_at: string;
}

// The exact JSON shape we ask Claude to return for each photo.
export interface CatalogVision {
  description: string;
  brand: string | null;
  primary_color: string;
  color_hex: string;
  category: string;
}
