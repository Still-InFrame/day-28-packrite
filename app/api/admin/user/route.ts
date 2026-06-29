import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Admin-only: block (ban), unblock, or delete a user. Gated by ADMIN_EMAIL and
// backed by the Supabase auth admin API (service role).
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { userId, action } = await request
    .json()
    .catch(() => ({}) as { userId?: string; action?: string });

  if (!userId || !["ban", "unban", "delete"].includes(action)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (userId === admin.id) {
    return NextResponse.json(
      { error: "You can't block or delete your own account." },
      { status: 400 },
    );
  }

  const client = createAdminClient();

  if (action === "delete") {
    // Best-effort: remove the user's photos (DB rows cascade via auth.users FK).
    try {
      const { data: files } = await client.storage
        .from("item-photos")
        .list(userId, { limit: 1000 });
      if (files && files.length) {
        await client.storage
          .from("item-photos")
          .remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch {
      // ignore storage cleanup failures
    }
    const { error } = await client.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { error } = await client.auth.admin.updateUserById(userId, {
    ban_duration: action === "ban" ? "876000h" : "none",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
