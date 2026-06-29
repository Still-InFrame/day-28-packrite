import Link from "next/link";
import { Wordmark } from "@/components/Brand";

export const CONTACT_EMAIL = "savion@stillinframe.com";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

export function LegalShell({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-5xl px-5 pb-20 pt-10">
      <header className="mb-8">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>

      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {updated}</p>

      <div className="mt-8 gap-10 md:grid md:grid-cols-[210px_minmax(0,1fr)]">
        {/* Table of contents — sticky on desktop, hidden on mobile */}
        <nav className="hidden md:block">
          <div className="sticky top-10">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              On this page
            </p>
            <ul className="space-y-0.5">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="block rounded-md px-2 py-1.5 text-sm leading-snug text-muted transition-colors hover:bg-zinc-100 hover:text-foreground"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Content */}
        <div className="min-w-0 space-y-7">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-8">
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                {s.title}
              </h2>
              <div className="space-y-3 text-sm leading-7 text-zinc-700">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </div>

      <footer className="mt-14 border-t border-border pt-6 text-xs text-muted">
        <Link href="/terms" className="hover:text-foreground hover:underline">
          Terms
        </Link>
        {" · "}
        <Link href="/privacy" className="hover:text-foreground hover:underline">
          Privacy
        </Link>
        {" · "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="hover:text-foreground hover:underline"
        >
          Contact
        </a>
      </footer>
    </div>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-1.5 text-sm leading-7 text-zinc-700">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
