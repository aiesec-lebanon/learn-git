import Link from "next/link";
import type { Route } from "next";
import { Logo } from "@/themes/active";

const NAV: readonly { href: Route; label: string }[] = [
  { href: "/playground", label: "Playground" },
  { href: "/reference", label: "Reference" },
  { href: "/settings", label: "Settings" },
];

export function SiteHeader() {
  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className="sticky top-0 z-40 border-b border-line bg-nav-bg backdrop-blur-sm"
    >
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 font-display text-xl font-bold text-fg no-underline"
        >
          <Logo className="size-7" />
          <span className="max-sm:sr-only">Learn Git</span>
        </Link>
        <nav aria-label="Site" className="ml-auto flex">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center px-1.5 text-sm font-semibold text-accent-ink sm:px-2 sm:text-base"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
