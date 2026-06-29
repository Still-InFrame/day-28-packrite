import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCatalogs } from "@/lib/catalogs";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Bootstrap a default catalog on first visit so capture always has a home.
  await getOrCreateCatalogs(supabase, user.id);

  // Record the user's country from Vercel's edge geolocation (no extra API,
  // no user input). Header is absent in local dev — captured once live.
  const country = (await headers()).get("x-vercel-ip-country");
  if (country && /^[A-Z]{2}$/.test(country)) {
    await supabase
      .from("packrite_user_meta")
      .upsert(
        { user_id: user.id, country, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const isAdmin = Boolean(
    adminEmail && user.email?.trim().toLowerCase() === adminEmail,
  );

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
      {children}
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
