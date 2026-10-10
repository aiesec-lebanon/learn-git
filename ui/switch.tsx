"use client";

import type { ReactNode } from "react";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
};

/** An on/off setting: a button with role="switch" whose label is its text. */
export function Switch({ checked, onCheckedChange, children }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="group inline-flex min-h-11 cursor-pointer items-center gap-3 text-fg"
    >
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-pill border-2 border-line-strong bg-surface transition-colors duration-(--dur-1) ease-standard group-aria-checked:border-accent-fill group-aria-checked:bg-accent-fill"
      >
        <span className="absolute top-0.5 left-0.5 size-4 rounded-pill bg-line-strong transition-transform duration-(--dur-1) ease-standard group-aria-checked:translate-x-5 group-aria-checked:bg-on-accent" />
      </span>
      {children}
    </button>
  );
}
