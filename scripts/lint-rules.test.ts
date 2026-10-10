import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: process.cwd() });

async function ruleIds(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((m) => m.ruleId);
}

describe("lint rules", { timeout: 30_000 }, () => {
  it.each([
    [
      "engine/a.ts",
      'import { useState } from "react";\n',
      "no-restricted-imports",
    ],
    ["engine/a.ts", 'import { x } from "@/lib/x";\n', "no-restricted-imports"],
    ["engine/a.ts", 'import fs from "node:fs";\n', "no-restricted-imports"],
    ["engine/a.ts", "export const w = window;\n", "no-restricted-globals"],
    [
      "engine/a.ts",
      "export const n = Intl.NumberFormat;\n",
      "no-restricted-globals",
    ],
    [
      "engine/a.ts",
      "export const t = Date.now();\n",
      "no-restricted-properties",
    ],
    [
      "engine/a.ts",
      "export const r = Math.random();\n",
      "no-restricted-properties",
    ],
    [
      "engine/a.ts",
      'export const c = "a".localeCompare("b");\n',
      "no-restricted-properties",
    ],
    ["engine/a.ts", "export const d = new Date();\n", "no-restricted-syntax"],
    [
      "engine/a.ts",
      "export const f = (s?: string) => s!;\n",
      "@typescript-eslint/no-non-null-assertion",
    ],
    [
      "content/a.ts",
      'import { x } from "@/features/x";\n',
      "no-restricted-imports",
    ],
    ["themes/a.ts", 'import { x } from "@/engine";\n', "no-restricted-imports"],
    ["ui/a.ts", 'import { x } from "@/themes/x";\n', "no-restricted-imports"],
    ["lib/a.ts", 'import { x } from "@/ui/x";\n', "no-restricted-imports"],
    [
      "features/a.ts",
      'import { x } from "@/app/x";\n',
      "no-restricted-imports",
    ],
    ["features/a.ts", 'console.log("x");\n', "no-console"],
    ["features/a.ts", 'eval("1");\n', "no-eval"],
    ["features/a.ts", 'export const f = new Function("1");\n', "no-new-func"],
    [
      "features/a.ts",
      "export const x: any = 1;\n",
      "@typescript-eslint/no-explicit-any",
    ],
    [
      "features/a.ts",
      'document.body.innerHTML = "x";\n',
      "no-restricted-properties",
    ],
    ["features/a.ts", 'document.write("x");\n', "no-restricted-properties"],
    [
      "features/a.tsx",
      'export const A = () => <div dangerouslySetInnerHTML={{ __html: "x" }} />;\n',
      "react/no-danger",
    ],
    [
      "features/a.tsx",
      'export const A = () => <img src="/a.png" />;\n',
      "jsx-a11y/alt-text",
    ],
  ])("%s reports %s", async (filePath, code, ruleId) => {
    expect(await ruleIds(filePath, code)).toContain(ruleId);
  });

  it.each([
    ["content/a.ts", 'import { x } from "@/engine";\nexport const y = x;\n'],
    ["ui/a.ts", 'import { x } from "@/lib/x";\nexport const y = x;\n'],
    ["engine/a.ts", "export const d = new Date(0);\n"],
    ["scripts/a.ts", 'console.log("x");\n'],
    [
      "themes/theme-style.tsx",
      'export const A = () => <style dangerouslySetInnerHTML={{ __html: "x" }} />;\n',
    ],
  ])("%s passes", async (filePath, code) => {
    expect(await ruleIds(filePath, code)).toEqual([]);
  });
});
