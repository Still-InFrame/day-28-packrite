import { createClient } from "@/lib/supabase/server";
import { KeyManager } from "@/components/KeyManager";
import { SignOutButton } from "@/components/SignOutButton";
import { Wordmark } from "@/components/Brand";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex-1 px-5 pb-28 pt-8">
      <header className="mb-7 flex items-center justify-between">
        <Wordmark />
      </header>

      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        Signed in as {user?.email}
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <KeyManager />

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-base font-semibold">Account</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Sign out of packrite on this device.
          </p>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
