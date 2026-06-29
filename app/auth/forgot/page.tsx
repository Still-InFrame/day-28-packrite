"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Wordmark className="mb-5" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Reset your password
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            We&apos;ll email you a secure link to set a new password.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {sent ? (
            <div className="text-center">
              <p className="text-sm text-foreground">
                If an account exists for{" "}
                <span className="font-medium">{email}</span>, a reset link is on
                its way. Check your inbox (and spam).
              </p>
              <Link href="/login">
                <Button variant="secondary" className="mt-5 w-full">
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
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
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" size="lg" loading={loading} className="w-full">
                Send reset link
              </Button>
              <Link
                href="/login"
                className="text-center text-sm font-medium text-muted hover:text-foreground"
              >
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
