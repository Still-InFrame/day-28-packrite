"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

type Mode = "signin" | "signup";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // Full navigation so the server picks up the fresh session cookie.
      router.push("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // With "Confirm email" disabled, a session is returned immediately.
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }
    setNotice("Check your email to confirm your account, then sign in.");
    setMode("signin");
    setLoading(false);
  }

  return (
    <div className="w-full">
      {/* Segmented control */}
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setNotice(null);
            }}
            className={`h-9 rounded-lg text-sm font-medium transition-all ${
              mode === m
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="password" className="mb-0">
              Password
            </Label>
            {mode === "signin" && (
              <Link
                href="/auth/forgot"
                className="text-xs font-medium text-accent hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <Input
            id="password"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-emerald-600">{notice}</p>}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-zinc-400">
        <span className="h-px flex-1 bg-border" />
        OR
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex justify-center [&>button]:w-full [&>button]:justify-center">
        <GoogleSignInButton />
      </div>
    </div>
  );
}
