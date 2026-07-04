import Link from "next/link";
import { MysplitwiseLogo, MysplitwiseMark } from "@/components/mysplitwise-logo";

/** Shared marketing/legal-page footer — mounted on the landing page plus every standalone public page (privacy, terms, contact). */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <MysplitwiseLogo size={26} />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            The easiest way to share expenses with friends and family and stop
            stressing about “who owes who.”
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { label: "Features", href: "/#features" },
            { label: "How it works", href: "/#how" },
            { label: "Open the app", href: "/app" },
          ]}
        />
        <FooterCol
          title="Company"
          links={[{ label: "Contact us", href: "/contact" }]}
        />
        <FooterCol
          title="Legal"
          links={[
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
          ]}
        />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} mysplitwise. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            <MysplitwiseMark size={16} /> Built with care
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sw-charcoal hover:text-primary">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
