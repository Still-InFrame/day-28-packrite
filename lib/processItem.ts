import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";
import type { CatalogVision } from "@/lib/types";

// Current Claude Sonnet vision model.
const VISION_MODEL = "claude-sonnet-4-6";

// Lifetime free catalogs on the app's shared key (ANTHROPIC_API_KEY). After
// this, users need an unlimited plan (subscription/admin grant) or their own key.
const FREE_LIMIT = 30;

const PROMPT = `You are cataloging a single physical item from a photo for a packing inventory.
Return ONLY raw JSON — no markdown, no backticks, no preamble — in exactly this shape:
{
  "description": "one concise sentence describing the item",
  "brand": "brand name or null if not visible",
  "primary_color": "plain color name",
  "color_hex": "#RRGGBB best-guess hex of the dominant color",
  "category": "broad category like shirt, pants, shoes, accessory, etc."
}`;

type Result = {
  status: "done" | "error" | "skipped" | "no_key" | "limited";
};

// Idempotent worker shared by the webhook, the client kick, and the reconciler.
// The caller passes the Supabase client to use: a user-session client (client
// kick / reconciler — works through RLS, no service-role key needed) or the
// service-role admin client (the webhook, which has no user session). The
// atomic pending -> processing claim guarantees the same item is never processed
// twice regardless of which trigger fires.
export async function processItem(
  itemId: string,
  supabase: SupabaseClient,
): Promise<Result> {
  // Atomic claim: only one caller can flip pending -> processing.
  const { data: item } = await supabase
    .from("packrite_catalog_items")
    .update({ status: "processing" })
    .eq("id", itemId)
    .eq("status", "pending")
    .select("id, user_id, image_path")
    .maybeSingle();

  if (!item) return { status: "skipped" }; // already claimed / done / missing

  try {
    // Pick the key: the user's own (unlimited) or the app's shared key (capped).
    const { data: keyRow } = await supabase
      .from("packrite_user_api_keys")
      .select("ciphertext, iv, auth_tag")
      .eq("user_id", item.user_id)
      .maybeSingle();

    let apiKey: string;
    if (keyRow) {
      apiKey = decrypt({
        ciphertext: keyRow.ciphertext,
        iv: keyRow.iv,
        authTag: keyRow.auth_tag,
      });
    } else if (process.env.ANTHROPIC_API_KEY) {
      // Free tier: spend one of the user's lifetime free catalogs (unlimited
      // plans pass without consuming).
      const { data: allowed } = await supabase.rpc("packrite_use_free_quota", {
        p_user: item.user_id,
        p_limit: FREE_LIMIT,
      });
      if (allowed === false) {
        await supabase
          .from("packrite_catalog_items")
          .update({ status: "limited" })
          .eq("id", item.id);
        return { status: "limited" };
      }
      apiKey = process.env.ANTHROPIC_API_KEY;
    } else {
      // No personal key and no shared key configured — wait for one.
      await supabase
        .from("packrite_catalog_items")
        .update({ status: "pending" })
        .eq("id", item.id);
      return { status: "no_key" };
    }

    if (!item.image_path) throw new Error("item has no image");

    const { data: file, error: dlErr } = await supabase.storage
      .from("item-photos")
      .download(item.image_path);
    if (dlErr || !file) throw dlErr ?? new Error("image download failed");

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64,
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const vision = parseVision(text);

    await supabase
      .from("packrite_catalog_items")
      .update({
        status: "done",
        description: vision.description,
        brand: vision.brand,
        primary_color: vision.primary_color,
        color_hex: vision.color_hex,
        category: vision.category,
        cataloged_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    return { status: "done" };
  } catch (err) {
    console.error("packrite: processItem failed", itemId, err);
    await supabase
      .from("packrite_catalog_items")
      .update({ status: "error" })
      .eq("id", item.id);
    return { status: "error" };
  }
}

// Tolerant parse: strip stray markdown fences, then JSON.parse inside try/catch.
function parseVision(raw: string): CatalogVision {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

  const parsed = JSON.parse(text) as Partial<CatalogVision>;
  return {
    description: String(parsed.description ?? "Unidentified item"),
    brand: parsed.brand ? String(parsed.brand) : null,
    primary_color: String(parsed.primary_color ?? "unknown"),
    color_hex: normalizeHex(parsed.color_hex),
    category: String(parsed.category ?? "item"),
  };
}

function normalizeHex(value: unknown): string {
  if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    return value.trim().toLowerCase();
  }
  return "#9ca3af"; // zinc-400 fallback
}
