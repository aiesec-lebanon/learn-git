import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TOKEN_NAMES, type ThemeScale, type TokenSet } from "./contract";
import { themeToCss } from "./css";

const set = (value: string) =>
  Object.fromEntries(TOKEN_NAMES.map((name) => [name, value])) as TokenSet;

const scale: ThemeScale = {
  size: {
    xs: "1px",
    sm: "2px",
    base: "3px",
    lg: "4px",
    xl: "5px",
    "2xl": "6px",
    "3xl": "7px",
    "4xl": "8px",
    display: "9px",
  },
  round: {
    xs: "1px",
    sm: "2px",
    md: "3px",
    lg: "4px",
    pill: "5px",
    btn: "6px",
  },
  elev: { "1": "none", "2": "none", "3": "none" },
  dur: { "1": "1ms", "2": "2ms", "3": "3ms", "4": "4ms" },
  curve: { standard: "linear", draw: "linear", stick: "linear" },
};

describe("themeToCss", () => {
  const css = themeToCss(
    { light: set("#111111"), dark: set("#222222") },
    scale,
  );

  it("puts light values and the scale on :root", () => {
    const root = css.slice(0, css.indexOf("}") + 1);
    expect(root).toMatch(/^:root\{color-scheme:light;/);
    expect(root).toContain("--bg:#111111;");
    expect(root).toContain("--size-display:9px;");
    expect(root).toContain("--curve-stick:linear;");
  });

  it("applies dark values for the system preference and for an explicit choice", () => {
    expect(css).toContain(
      '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){color-scheme:dark;',
    );
    expect(css).toContain(':root[data-theme="dark"]{color-scheme:dark;');
    expect(css.match(/--bg:#222222;/g)).toHaveLength(2);
    expect(css.match(/--size-xs:/g)).toHaveLength(1);
  });

  it("writes declarations in a stable order", () => {
    const names = [...css.matchAll(/--([a-z0-9-]+):#111111;/g)].map(
      (m) => m[1],
    );
    expect(names).toEqual([...TOKEN_NAMES].sort());
  });
});

describe("app/globals.css", () => {
  it("maps every token to a Tailwind colour", () => {
    const globals = readFileSync("app/globals.css", "utf8");
    for (const name of TOKEN_NAMES) {
      expect(globals).toContain(`--color-${name}: var(--${name});`);
    }
  });
});
