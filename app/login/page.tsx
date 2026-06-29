import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-10">
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="packrite" className="mb-3 size-20" />
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            packrite
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Snap it. Pack it.
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Point your phone at an item and move on — packrite catalogs
            everything in the background.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <AuthForm />
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-400">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
