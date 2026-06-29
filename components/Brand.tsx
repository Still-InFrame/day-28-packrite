import { cn } from "@/lib/cn";

// Stylized open-box mark — reads as "packing" at any size.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-7", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="packrite-g" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <path
        d="M16 3 4 9v14l12 6 12-6V9L16 3Z"
        fill="url(#packrite-g)"
      />
      <path
        d="M4 9l12 6 12-6M16 15v14"
        stroke="white"
        strokeOpacity="0.85"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="16" cy="12" r="2.1" fill="white" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logo />
      <span className="text-lg font-semibold tracking-tight text-foreground">
        packrite
      </span>
    </span>
  );
}
