import { flag, type OptionSpec } from "../cli/options";
import { shellQuote } from "../cli/tokenize";
import { canonicalKey } from "../config/keys";
import {
  configValue,
  scopedEntries,
  setEntry,
  unsetEntry,
  writeScope,
} from "../config/scopes";
import { notSimulated } from "../messages/git";
import { CONFIG_USAGE, configMessages as m } from "../messages/config";
import type { ConfigScope } from "../types";
import {
  type CommandResult,
  defineCommand,
  type GitContext,
  refuse,
} from "./registry";

const UNSIMULATED: readonly OptionSpec[] = [
  ["file", "f", "required"],
  ["blob", undefined, "required"],
  ["worktree"],
  ["get-all"],
  ["get-regexp"],
  ["get-urlmatch"],
  ["replace-all"],
  ["add"],
  ["unset-all"],
  ["rename-section"],
  ["remove-section"],
  ["edit", "e"],
  ["type", undefined, "required"],
  ["bool"],
  ["int"],
  ["null", "z"],
  ["name-only"],
  ["show-origin"],
  ["includes"],
  ["default", undefined, "required"],
  ["all"],
].map(([long, short, value]) => ({
  key: `x-${long}`,
  long,
  ...(short ? { short } : {}),
  ...(value ? { value: value as "required" } : {}),
}));

const OPTIONS: readonly OptionSpec[] = [
  { key: "global", long: "global" },
  { key: "system", long: "system" },
  { key: "local", long: "local" },
  { key: "get", long: "get" },
  { key: "list", short: "l", long: "list" },
  { key: "unset", long: "unset" },
  { key: "show-scope", long: "show-scope" },
  ...UNSIMULATED,
];

type Ctx = GitContext;

function chosenScope(ctx: Ctx): ConfigScope | undefined {
  return (["system", "global", "local"] as const).find((s) =>
    flag(ctx.options, s),
  );
}

function keyError(
  key: string,
  missingSectionCode: number,
): CommandResult | null {
  if (!key.includes("."))
    return refuse("usage", m.noSection(key), missingSectionCode);
  return canonicalKey(key) ? null : refuse("usage", m.invalidKey(key), 1);
}

function list(ctx: Ctx, scope: ConfigScope | undefined): CommandResult {
  if (scope === "local" && !ctx.repo)
    return refuse("not-a-repository", m.localOutside());
  if (scope === "global" && ctx.machine.config === null) {
    return refuse("usage", m.noGlobalFile(ctx.machine.home));
  }
  const showScope = flag(ctx.options, "show-scope");
  const stdout = scopedEntries(ctx.world, ctx.machine, ctx.repo, scope)
    .map((e) => {
      const entry = e.value === null ? e.key : `${e.key}=${e.value}`;
      return `${showScope ? `${e.scope}\t` : ""}${entry}\n`;
    })
    .join("");
  return { stdout };
}

function get(
  ctx: Ctx,
  scope: ConfigScope | undefined,
  key: string,
): CommandResult {
  if (scope === "local" && !ctx.repo)
    return refuse("not-a-repository", m.localOutside());
  const problem = keyError(key, 1);
  if (problem) return problem;
  const value = configValue(
    ctx.world,
    ctx.machine,
    ctx.repo,
    canonicalKey(key) ?? key,
    scope,
  );
  return value === undefined ? { exitCode: 1 } : { stdout: `${value ?? ""}\n` };
}

function write(
  ctx: Ctx,
  scope: ConfigScope | undefined,
  key: string,
  value: string | null,
): CommandResult {
  if (scope === "system") return refuse("usage", m.systemLocked(), 255);
  if (scope !== "global" && !ctx.repo) {
    return refuse(
      "not-a-repository",
      scope === "local" ? m.localOutside() : m.notInGitDir(),
    );
  }
  const problem = keyError(key, 2);
  if (problem) return problem;
  const canonical = canonicalKey(key) ?? key;
  const target = scope === "global" ? "global" : "local";
  const file =
    (target === "global" ? ctx.machine.config : ctx.repo?.config) ?? [];
  const from =
    configValue(ctx.world, ctx.machine, ctx.repo, canonical, target) ?? null;
  const next =
    value === null
      ? unsetEntry(file, canonical)
      : setEntry(file, canonical, value);
  if (next === null) return { exitCode: 5 };
  if (from === value) return {};
  const { world, effect } = writeScope(
    ctx.world,
    ctx.machine,
    ctx.repo,
    target,
    next,
    {
      key: canonical,
      from,
      to: value,
    },
  );
  return { world, effects: [effect] };
}

const SUBCOMMANDS: ReadonlyMap<string, number> = new Map([
  ["list", 0],
  ["get", 1],
  ["set", 2],
  ["unset", 1],
]);

function modern(
  ctx: Ctx,
  scope: ConfigScope | undefined,
  sub: string,
  args: readonly string[],
): CommandResult {
  const expected = SUBCOMMANDS.get(sub) ?? 0;
  if (args.length !== expected) {
    const usage = CONFIG_USAGE[sub as keyof typeof CONFIG_USAGE];
    return refuse("usage", m.wrongArgs(String(expected), usage), 129);
  }
  const [name = "", value = ""] = args;
  if (sub === "list") return list(ctx, scope);
  if (sub === "get") return get(ctx, scope, name);
  return write(ctx, scope, name, sub === "set" ? value : null);
}

export const config = defineCommand({
  name: "config",
  counted: true,
  needsRepo: false,
  usage: CONFIG_USAGE.legacy,
  options: OPTIONS,
  run: (ctx) => {
    const unsupported = [...ctx.options.values.keys()].find((k) =>
      k.startsWith("x-"),
    );
    if (unsupported) {
      return refuse(
        "not-simulated",
        notSimulated(`git config --${unsupported.slice(2)}`),
        1,
      );
    }
    const scope = chosenScope(ctx);
    const args = ctx.options.args;
    const usageError = (expected: string) =>
      refuse("usage", m.wrongArgs(expected, CONFIG_USAGE.legacy), 129);
    if (flag(ctx.options, "list")) {
      return args.length ? usageError("0") : list(ctx, scope);
    }
    if (flag(ctx.options, "get")) {
      if (args.length === 0 || args.length > 2)
        return usageError("from 1 to 2");
      if (args.length === 2)
        return refuse(
          "not-simulated",
          notSimulated("git config --get with a value pattern"),
          1,
        );
      return get(ctx, scope, args[0] ?? "");
    }
    if (flag(ctx.options, "unset")) {
      if (args.length === 0 || args.length > 2)
        return usageError("from 1 to 2");
      if (args.length === 2)
        return refuse(
          "not-simulated",
          notSimulated("git config --unset with a value pattern"),
          1,
        );
      return write(ctx, scope, args[0] ?? "", null);
    }
    const [first = "", ...rest] = args;
    if (SUBCOMMANDS.has(first)) return modern(ctx, scope, first, rest);
    if (args.length === 0)
      return refuse("usage", `${CONFIG_USAGE.legacy}\n\n`, 129);
    if (args.length === 1) return get(ctx, scope, first);
    if (args.length > 2)
      return refuse(
        "not-simulated",
        notSimulated("git config with a value pattern"),
        1,
      );
    const value = rest[0] ?? "";
    const result = write(ctx, scope, first, value);
    return { ...result, notes: [m.legacySet(first, shellQuote(value))] };
  },
});
