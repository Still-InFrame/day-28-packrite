import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processItem } from "@/lib/processItem";

export const runtime = "nodejs";
export const maxDuration = 60;

// Two trusted callers:
//  1. The Supabase Database Webhook (on INSERT) — carries x-webhook-secret, no
//     user session, so it processes with the service-role client.
//  2. The browser right after a capture — carries the user's session cookie, so
//     it processes through RLS with that session (no service-role key needed).
export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");

  if (secret) {
    if (secret !== process.env.CATALOG_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await request.json().catch(() => null);
    const itemId: string | undefined = body?.record?.id ?? body?.itemId;
    if (!itemId) {
      return NextResponse.json({ error: "missing itemId" }, { status: 400 });
    }
    const result = await processItem(itemId, createAdminClient());
    return NextResponse.json(result);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const itemId: string | undefined = body?.itemId;
  if (!itemId) {
    return NextResponse.json({ error: "missing itemId" }, { status: 400 });
  }

  // Confirm the row belongs to the caller (RLS scopes this select to them).
  const { data } = await supabase
    .from("packrite_catalog_items")
    .select("id")
    .eq("id", itemId)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const result = await processItem(itemId, supabase);
  return NextResponse.json(result);
}
