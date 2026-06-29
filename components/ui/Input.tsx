import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground",
        "placeholder:text-zinc-400 transition-shadow",
        "focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-ring)]",
        "disabled:opacity-60",
        className,
      )}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={cn(
        "mb-1.5 block text-sm font-medium text-foreground",
        className,
      )}
    />
  );
}
