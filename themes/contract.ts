import type { ReactNode } from "react";

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

export type SkinPoint = Readonly<{ x: number; y: number }>;
export type SkinEdge = Readonly<{
  key: string;
  from: SkinPoint;
  to: SkinPoint;
  merge: boolean;
  ghost: boolean;
}>;
/** Ghost 1: reachable only through the reflog; 2: unreachable. */
export type SkinNode = Readonly<{
  id: string;
  short: string;
  merge: boolean;
  root: boolean;
  ghost: 0 | 1 | 2;
}>;
export type SkinLabel = Readonly<{
  text: string;
  kind: "branch" | "remote" | "tag" | "head";
  /** The branch HEAD is on (or HEAD itself when detached). */
  current: boolean;
  /** Note colour slot: 0 for the default branch, 1 to 3 for others. */
  slot: 0 | 1 | 2 | 3;
  /** Small print under the label (counters, last contact). */
  note?: string;
}>;

/** How a theme draws the commit graph; it sees view data only (ADR-007). */
export type ThemeSkin = Readonly<{
  graph: Readonly<{
    column: number;
    lane: number;
    /** Average label glyph width in px (layout estimates, no measuring). */
    glyph: number;
    pad: number;
    /** Commit radius in px. */
    node: number;
    /** Room for stacked labels above and below the commits. */
    top: number;
    bottom: number;
  }>;
  edgePath: (edge: SkinEdge) => string;
  Node: (props: { node: SkinNode }) => ReactNode;
  Label: (props: { label: SkinLabel }) => ReactNode;
}>;

/** The guide's poses; "pleased" is brief and only follows a success. */
export type GuidePose = "idle" | "explaining" | "surprised" | "pleased";

/** The theme's guide character: decoration only, its words live in the DOM. */
export type GuideCharacter = (props: {
  pose: GuidePose;
  animate: boolean;
}) => ReactNode;
