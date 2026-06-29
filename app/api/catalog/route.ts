import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processItem } from "@/lib/processItem";

export const runtime = "nodejs";
export const maxDuration = 60;

// Two trusted callers:
//  1. The Supabase Database Webhook (on INSERT) — carries x-webhook-secret.
//  2. The browser right after a capture — carries the user's session cookie.
// Either way we resolve a single itemId and hand it to the idempotent worker.
export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  let itemId: string | undefined;

  if (secret) {
    if (secret !== process.env.CATALOG_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    itemId = body?.record?.id ?? body?.itemId;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    itemId = body?.itemId;

    // Confirm the row belongs to the caller (RLS scopes this select to them).
    if (itemId) {
      const { data } = await supabase
        .from("packrite_catalog_items")
        .select("id")
        .eq("id", itemId)
        .maybeSingle();
      if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  }

  if (!itemId) {
    return NextResponse.json({ error: "missing itemId" }, { status: 400 });
  }

  const result = await processItem(itemId);
  return NextResponse.json(result);
}
