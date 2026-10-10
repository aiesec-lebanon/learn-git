export const TOKEN_NAMES = [
  "bg",
  "bg-alt",
  "surface",
  "sunk",
  "line",
  "line-strong",
  "fg",
  "fg-muted",
  "accent",
  "accent-ink",
  "accent-fill",
  "accent-fill-hover",
  "on-accent",
  "accent-soft",
  "focus",
  "hl",
  "shadow",
  "sticky-shadow",
  "nav-bg",
  "guide",
  "guide-ink",
  "st-untracked",
  "st-untracked-bg",
  "st-modified",
  "st-modified-bg",
  "st-staged",
  "st-staged-bg",
  "st-added",
  "st-added-bg",
  "st-deleted",
  "st-deleted-bg",
  "st-conflict",
  "st-conflict-bg",
  "g-bg",
  "g-edge",
  "g-node",
  "g-node-fill",
  "g-text",
  "g-b0",
  "g-b0-fg",
  "g-b1",
  "g-b1-fg",
  "g-b2",
  "g-b2-fg",
  "g-b3",
  "g-b3-fg",
  "g-head",
  "g-head-fg",
  "g-remote",
  "g-dim",
  "g-route",
  "term-bg",
  "term-fg",
  "term-muted",
  "term-accent",
  "term-err",
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];
export type TokenSet = Readonly<Record<TokenName, string>>;
export type ThemeTokens = Readonly<{ light: TokenSet; dark: TokenSet }>;

/** A WCAG pair: label, foreground, background, minimum ratio (4.5 text, 3 UI). */
export type ContrastPair = readonly [string, TokenName, TokenName, 3 | 4.5];

type Steps<K extends string> = Readonly<Record<K, string>>;

export type ThemeScale = Readonly<{
  size: Steps<
    "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "display"
  >;
  round: Steps<"xs" | "sm" | "md" | "lg" | "pill" | "btn">;
  elev: Steps<"1" | "2" | "3">;
  dur: Steps<"1" | "2" | "3" | "4">;
  curve: Steps<"standard" | "draw" | "stick">;
}>;

export type ThemeCopy = Readonly<{ name: string; tagline: string }>;
