import { Wordmark } from "@/components/Brand";
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
          <Wordmark className="mb-5" />
          <h1 className="text-2xl font-semibold tracking-tight">
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

        <p className="mt-6 text-center text-xs text-zinc-400">
          Day 28 of the 100 Day AI Build Challenge
        </p>
      </div>
    </div>
  );
}
