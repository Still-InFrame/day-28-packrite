import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processItem } from "@/lib/processItem";

export const runtime = "nodejs";
export const maxDuration = 60;

const STUCK_PENDING_MS = 60_000; // webhook miss, or key added after capture
const STALE_PROCESSING_MS = 180_000; // worker died mid-flight
const BATCH = 5;

// Safety net for the background pipeline. The browser calls this when the
// catalog screen loads; it re-queues anything the webhook + client-kick missed.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = Date.now();

  // Reclaim rows wedged in 'processing' (e.g. a serverless crash mid-job).
  await supabase
    .from("packrite_catalog_items")
    .update({ status: "pending" })
    .eq("status", "processing")
    .lt("created_at", new Date(now - STALE_PROCESSING_MS).toISOString());

  // Pick up rows that have been pending too long.
  const { data: stuck } = await supabase
    .from("packrite_catalog_items")
    .select("id")
    .eq("status", "pending")
    .lt("created_at", new Date(now - STUCK_PENDING_MS).toISOString())
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (!stuck || stuck.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  for (const row of stuck) {
    await processItem(row.id, supabase);
  }

  return NextResponse.json({ processed: stuck.length });
}
