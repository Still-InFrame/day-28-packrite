import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Block (ban), unblock, or delete a user — via admin-gated SECURITY DEFINER
// RPCs, so no service-role key is required. The RPC re-checks admin + self.
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { userId, action } = await request
    .json()
    .catch(() => ({}) as { userId?: string; action?: string });

  if (!userId || !["ban", "unban", "delete"].includes(action)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } =
    action === "delete"
      ? await supabase.rpc("packrite_admin_delete_user", { p_target: userId })
      : await supabase.rpc("packrite_admin_set_blocked", {
          p_target: userId,
          p_blocked: action === "ban",
        });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
