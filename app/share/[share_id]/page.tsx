import { Wordmark } from "@/components/Brand";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Catalog, CatalogItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: {
  params: Promise<{ share_id: string }>;
}) {
  const { share_id } = await params;

  let catalog: Catalog | null = null;
  let items: CatalogItem[] = [];
  const signed: Record<string, string> = {};

  try {
    const admin = createAdminClient();

    const { data: cat } = await admin
      .from("packrite_catalogs")
      .select("*")
      .eq("share_id", share_id)
      .eq("is_shared", true)
      .maybeSingle();

    if (cat) {
      catalog = cat as Catalog;
      const { data: rows } = await admin
        .from("packrite_catalog_items")
        .select("*")
        .eq("catalog_id", catalog.id)
        .eq("status", "done")
        .order("created_at", { ascending: false });
      items = (rows as CatalogItem[]) ?? [];

      const paths = items
        .map((i) => i.image_path)
        .filter((p): p is string => Boolean(p));
      if (paths.length) {
        const { data: urls } = await admin.storage
          .from("item-photos")
          .createSignedUrls(paths, 3600);
        for (const u of urls ?? []) {
          if (u.path && u.signedUrl) signed[u.path] = u.signedUrl;
        }
      }
    }
  } catch {
    // Service role not configured — treat as unavailable.
    catalog = null;
  }

  if (!catalog) return <Unavailable />;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-16 pt-10">
      <header className="mb-8 flex items-center justify-between">
        <Wordmark />
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          Shared catalog
        </span>
      </header>

      <h1 className="text-2xl font-semibold tracking-tight">{catalog.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {items.length} {items.length === 1 ? "item" : "items"}
      </p>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted">
          This catalog doesn&apos;t have any cataloged items yet.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
            >
              <div className="relative aspect-square bg-zinc-100">
                {item.image_path && signed[item.image_path] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signed[item.image_path]}
                    alt={item.description ?? "Item"}
                    className="size-full object-cover"
                  />
                )}
                {item.category && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium capitalize text-white backdrop-blur">
                    {item.category}
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium leading-snug">
                  {item.description}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {item.color_hex && (
                    <span
                      className="size-4 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: item.color_hex }}
                    />
                  )}
                  <span className="truncate text-xs capitalize text-muted">
                    {[item.primary_color, item.brand].filter(Boolean).join(" · ") ||
                      "—"}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <footer className="mt-12 text-center text-xs text-zinc-400">
        Cataloged with packrite
      </footer>
    </div>
  );
}

function Unavailable() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Wordmark className="mb-6" />
      <h1 className="text-xl font-semibold">This link isn&apos;t available</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        The catalog may have been unshared or the link was rotated. Ask the owner
        for a fresh link.
      </p>
    </div>
  );
}
