import { redirect } from "next/navigation";
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

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
      {children}
      <BottomNav />
    </div>
  );
}
