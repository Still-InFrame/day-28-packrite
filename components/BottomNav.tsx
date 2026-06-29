"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/", label: "Capture", icon: CameraIcon },
  { href: "/catalog", label: "Catalog", icon: GridIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[480px] justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-black/5 bg-white/85 p-1.5 shadow-lg shadow-black/10 backdrop-blur-xl">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-accent text-white shadow-sm"
                  : "text-zinc-500 hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className={cn(active ? "inline" : "hidden sm:inline")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2c.5 0 .96-.27 1.2-.7l.5-.9A1.5 1.5 0 0 1 10.9 3.6h2.2c.55 0 1.06.3 1.32.79l.5.91c.24.43.7.7 1.2.7h1.38A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 2.5l1.3 2.2 2.5-.5.4 2.5 2.2 1.3-1.1 2.3 1.1 2.3-2.2 1.3-.4 2.5-2.5-.5L12 21.5l-1.3-2.2-2.5.5-.4-2.5-2.2-1.3 1.1-2.3-1.1-2.3 2.2-1.3.4-2.5 2.5.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
