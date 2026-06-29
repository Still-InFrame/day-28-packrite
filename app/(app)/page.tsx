import { createClient } from "@/lib/supabase/server";
import { getOrCreateCatalogs } from "@/lib/catalogs";
import { Camera } from "@/components/Camera";
import { planLabel } from "@/lib/plan";

export default async function CapturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const catalogs = await getOrCreateCatalogs(supabase, user!.id);

  const { data: keyRow } = await supabase
    .from("packrite_user_api_keys")
    .select("user_id")
    .maybeSingle();

  const { data: sub } = await supabase
    .from("packrite_subscriptions")
    .select("plan, source, plan_interval, plan_amount, plan_currency, stripe_subscription_id")
    .maybeSingle();

  const hasKey = Boolean(keyRow);
  const unlimited = hasKey || sub?.plan === "unlimited";
  const stripeManaged =
    sub?.source === "stripe" && Boolean(sub?.stripe_subscription_id);

  return (
    <Camera
      catalogs={catalogs}
      userId={user!.id}
      hasKey={hasKey}
      unlimited={unlimited}
      stripeManaged={stripeManaged}
      planLabel={planLabel(sub?.plan_interval, sub?.plan_amount, sub?.plan_currency)}
    />
  );
}
