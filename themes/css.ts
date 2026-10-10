import type { ThemeScale, ThemeTokens, TokenSet } from "./contract";

const declarations = (vars: Readonly<Record<string, string>>) =>
  Object.keys(vars)
    .sort()
    .map((name) => `--${name}:${vars[name]};`)
    .join("");

const block = (selector: string, scheme: string, set: TokenSet, extra = "") =>
  `${selector}{color-scheme:${scheme};${extra}${declarations(set)}}`;

function flattenScale(scale: ThemeScale): Record<string, string> {
  return Object.fromEntries(
    Object.entries(scale).flatMap(([group, steps]) =>
      Object.entries(steps).map(([step, value]) => [`${group}-${step}`, value]),
    ),
  );
}

/**
 * Light values on :root; dark values for the system preference unless the
 * learner chose light, and for an explicit dark choice.
 */
export function themeToCss(tokens: ThemeTokens, scale: ThemeScale): string {
  return [
    block(":root", "light", tokens.light, declarations(flattenScale(scale))),
    `@media (prefers-color-scheme: dark){${block(':root:not([data-theme="light"])', "dark", tokens.dark)}}`,
    block(':root[data-theme="dark"]', "dark", tokens.dark),
  ].join("");
}
