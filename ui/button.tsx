import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

const variants = {
  primary: "bg-accent-fill text-on-accent hover:bg-accent-fill-hover",
  secondary: "border-line-strong bg-surface text-fg hover:border-fg",
  quiet: "px-2.5 text-accent-ink hover:bg-accent-soft",
} as const;

export type ButtonVariant = keyof typeof variants;

export const buttonClass = (variant: ButtonVariant, className?: string) =>
  cx(
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-btn border-2 border-transparent px-4.5 text-sm font-semibold no-underline transition-colors duration-(--dur-1) ease-standard active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45",
    variants[variant],
    className,
  );

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant };

export function Button({
  variant = "secondary",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, className)}
      {...props}
    />
  );
}
