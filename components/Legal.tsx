import Link from "next/link";
import { Wordmark } from "@/components/Brand";

export const CONTACT_EMAIL = "savion@stillinframe.com";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl px-5 pb-20 pt-10">
      <header className="mb-8">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>

      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {updated}</p>

      <div className="mt-8 space-y-7">{children}</div>

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

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-zinc-700">{children}</div>
    </section>
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
