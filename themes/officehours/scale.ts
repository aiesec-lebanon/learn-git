import type { ThemeScale } from "../contract";

export const scale: ThemeScale = {
  size: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1.0625rem",
    lg: "1.25rem",
    xl: "1.5rem",
    "2xl": "1.875rem",
    "3xl": "clamp(2rem, 1.5rem + 2vw, 2.75rem)",
    "4xl": "clamp(2.5rem, 1.6rem + 3.4vw, 4.25rem)",
    display: "clamp(3.75rem, 2rem + 7vw, 8rem)",
  },
  round: {
    xs: "3px 4px 3px 5px",
    sm: "6px 8px 7px 9px",
    md: "12px 16px 13px 17px",
    lg: "18px 22px 19px 24px",
    pill: "999px",
    btn: "11px 15px 12px 16px / 15px 11px 16px 12px",
  },
  elev: {
    "1": "0 1px 0 var(--sticky-shadow), 0 5px 9px -6px var(--sticky-shadow)",
    "2": "0 12px 24px -12px var(--shadow), 0 2px 0 var(--sticky-shadow)",
    "3": "0 32px 64px -26px var(--shadow)",
  },
  dur: { "1": "120ms", "2": "200ms", "3": "520ms", "4": "900ms" },
  curve: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    draw: "cubic-bezier(0.5, 0, 0.2, 1)",
    stick: "cubic-bezier(0.34, 1.3, 0.64, 1)",
  },
};
