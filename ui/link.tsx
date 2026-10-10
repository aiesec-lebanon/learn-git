import Link, { type LinkProps } from "next/link";
import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";
import { VisuallyHidden } from "./visually-hidden";

const linkClass =
  "text-accent-ink underline decoration-1 underline-offset-[0.2em] hover:decoration-2";

/** A link to a route of this site; typed routes reject paths that do not exist. */
export function AppLink<T extends string>({
  className,
  ...props
}: LinkProps<T>) {
  return <Link className={cx(linkClass, className)} {...props} />;
}

type ExternalLinkProps = Omit<
  ComponentProps<"a">,
  "href" | "target" | "rel"
> & {
  href: `https://${string}`;
};

/** Opens another site in a new tab and says so to screen readers. */
export function ExternalLink({
  className,
  children,
  ...props
}: ExternalLinkProps) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={cx(linkClass, className)}
      {...props}
    >
      {children}
      <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
    </a>
  );
}
