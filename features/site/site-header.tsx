import Link from "next/link";
import { Logo } from "@/themes/active";

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
          Learn Git
        </Link>
        <nav aria-label="Site" className="ml-auto flex">
          <Link
            href="/playground"
            className="inline-flex min-h-11 items-center px-2 font-semibold text-accent-ink"
          >
            Playground
          </Link>
          <Link
            href="/settings"
            className="inline-flex min-h-11 items-center px-2 font-semibold text-accent-ink"
          >
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
