"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

// Sticky table of contents with scroll-spy: highlights the section currently
// in view via an IntersectionObserver.
export function LegalNav({ items }: { items: { id: string; title: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      // A section becomes "active" once its top crosses the upper third.
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className="hidden md:block">
      <div className="sticky top-10">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          On this page
        </p>
        <ul className="space-y-0.5">
          {items.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={() => setActive(s.id)}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-sm leading-snug transition-colors",
                  active === s.id
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:bg-zinc-100 hover:text-foreground",
                )}
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
