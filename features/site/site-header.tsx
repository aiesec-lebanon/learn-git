import Link from "next/link";
import { Logo } from "@/themes/active";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-nav-bg backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 font-display text-xl font-bold text-fg no-underline"
        >
          <Logo className="size-7" />
          Learn Git
        </Link>
      </div>
    </header>
  );
}
