import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt, maskKey } from "@/lib/crypto";

// All routes here run on the user's session and write through RLS, so a user
// can only ever touch their own key row.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("packrite_user_api_keys")
    .select("key_hint, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    hasKey: Boolean(data),
    hint: data?.key_hint ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { key } = await request.json().catch(() => ({ key: undefined }));
  if (typeof key !== "string" || !key.trim().startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "That doesn't look like an Anthropic API key (expected sk-ant-…)." },
      { status: 400 },
    );
  }

  const trimmed = key.trim();
  const { ciphertext, iv, authTag } = encrypt(trimmed);

  const { error } = await supabase.from("packrite_user_api_keys").upsert({
    user_id: user.id,
    ciphertext,
    iv,
    auth_tag: authTag,
    key_hint: maskKey(trimmed),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, hint: maskKey(trimmed) });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("packrite_user_api_keys")
    .delete()
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
