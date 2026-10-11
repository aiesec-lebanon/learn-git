import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import { createWorld } from "../world/create";
import { ignoreRules } from "./rules";
import { compileName, compilePath } from "./wildmatch";

const rules = (files: Record<string, string>) =>
  ignoreRules(new Map(Object.entries(files)));

describe("wildmatch", () => {
  it.each([
    ["*.log", "app.log", true],
    ["*.log", "app.txt", false],
    ["?.md", "a.md", true],
    ["[a-c]x", "bx", true],
    ["[!a-c]x", "bx", false],
    ["[^a-c]x", "dx", true],
    ["[]]", "]", true],
    ["\\*", "*", true],
    ["\\*", "a", false],
    ["[ab", "a", false],
  ])("name %s against %s is %s", (glob, name, want) => {
    expect(compileName(glob)(name)).toBe(want);
  });

  it.each([
    ["docs/*.tmp", "docs/a.tmp", true],
    ["docs/*.tmp", "docs/deep/a.tmp", false],
    ["docs/**/*.tmp", "docs/a.tmp", true],
    ["docs/**/*.tmp", "docs/x/y/a.tmp", true],
    ["**/build", "build", true],
    ["**/build", "a/b/build", true],
    ["vendor/**", "vendor", false],
    ["vendor/**", "vendor/a/b", true],
    ["a**b/c", "axyb/c", true],
  ])("path %s against %s is %s", (glob, path, want) => {
    expect(compilePath(glob)(path)).toBe(want);
  });

  it("stays fast on hostile patterns", () => {
    const glob = `${"*a".repeat(40)}*b`;
    const started = performance.now();
    expect(compileName(glob)("a".repeat(4000))).toBe(false);
    expect(compilePath(`${"**/".repeat(40)}x`)(`${"a/".repeat(200)}y`)).toBe(
      false,
    );
    expect(performance.now() - started).toBeLessThan(250);
  });
});

describe(".gitignore rules", () => {
  it("lets the last matching line win, skipping comments and blanks", () => {
    const r = rules({ ".gitignore": "*.log\n\n# note\n!keep.log\n" });
    expect(r.ignored("a.log")).toBe(true);
    expect(r.ignored("keep.log")).toBe(false);
    expect(r.ignored("sub/a.log")).toBe(true);
  });

  it("anchors patterns with a slash and keeps folder-only ones off files", () => {
    const r = rules({ ".gitignore": "/build\nout/\n" });
    expect(r.ignored("build", true)).toBe(true);
    expect(r.ignored("src/build", true)).toBe(false);
    expect(r.ignored("out")).toBe(false);
    expect(r.ignored("out/a.js")).toBe(true);
  });

  it("never re-includes a file under an excluded folder", () => {
    const r = rules({
      ".gitignore": "vendor/\n!vendor/lib/keep.js\n",
      "vendor/.gitignore": "!*\n",
    });
    expect(r.ignored("vendor/lib/keep.js")).toBe(true);
  });

  it("lets a deeper file override a shallower one", () => {
    const r = rules({ ".gitignore": "*.js\n", "src/.gitignore": "!main.js\n" });
    expect(r.ignored("src/main.js")).toBe(false);
    expect(r.ignored("main.js")).toBe(true);
  });

  it("honors escapes and trailing spaces", () => {
    const r = rules({ ".gitignore": "\\#a\n\\!b\nc  \nd\\ \n" });
    expect(r.ignored("#a")).toBe(true);
    expect(r.ignored("!b")).toBe(true);
    expect(r.ignored("c")).toBe(true);
    expect(r.ignored("d ")).toBe(true);
  });
});

describe("git status --ignored", () => {
  const world = () =>
    createWorld({
      files: { "p/.gitignore": "*.log\n", "p/a.log": "x\n" },
      cwd: "p",
      setup: ["git init -q"],
    });
  const out = (line: string) => runLine(world(), line).outcomes.at(-1)?.output;

  it("names the refusal when git add meets an ignored path", () => {
    const outcome = runLine(world(), "git add a.log").outcomes.at(-1);
    expect(outcome?.effects.at(-1)).toMatchObject({ code: "path-ignored" });
  });

  it("refuses an unknown mode", () => {
    expect(out("git status --ignored=odd")?.stderr).toBe(
      "fatal: Invalid ignored mode 'odd'\n",
    );
  });

  it("hides ignored files unless asked", () => {
    expect(out("git status -s")?.stdout).toBe("?? .gitignore\n");
    expect(out("git status -s --ignored=no")?.stdout).toBe("?? .gitignore\n");
    expect(out("git status -s --ignored")?.stdout).toBe(
      "?? .gitignore\n!! a.log\n",
    );
  });
});
