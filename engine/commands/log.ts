import { lastValue, type OptionSpec } from "../cli/options";
import { subjectOf } from "../commit/message";
import { decorations } from "../format/decorate";
import { formatGitDate } from "../format/date";
import { walkCommits } from "../log/walk";
import { notSimulated } from "../messages/git";
import { abbreviate } from "../objects/abbrev";
import { shortRefName } from "../refs/names";
import { resolveHead } from "../refs/refs";
import type { LineRef } from "../types";
import { defineCommand, refuse } from "./registry";

const UNSIMULATED = [
  ["graph"],
  ["all"],
  ["stat"],
  ["shortstat"],
  ["numstat"],
  ["name-only"],
  ["name-status"],
  ["patch", "p"],
  ["u", "u"],
  ["author", undefined, true],
  ["committer", undefined, true],
  ["grep", undefined, true],
  ["since", undefined, true],
  ["until", undefined, true],
  ["after", undefined, true],
  ["before", undefined, true],
  ["S", "S", true],
  ["G", "G", true],
  ["L", "L", true],
  ["follow"],
  ["first-parent"],
  ["reverse"],
  ["pretty", undefined, "optional"],
  ["format", undefined, true],
  ["abbrev-commit"],
  ["abbrev", undefined, "optional"],
  ["date", undefined, true],
  ["merges"],
  ["no-merges"],
  ["branches", undefined, "optional"],
  ["tags", undefined, "optional"],
  ["remotes", undefined, "optional"],
  ["source"],
  ["color", undefined, "optional"],
  ["topo-order"],
  ["date-order"],
  ["walk-reflogs", "g"],
  ["skip", undefined, true],
  ["relative-date"],
  ["parents"],
  ["raw"],
  ["word-diff", undefined, "optional"],
  ["show-signature"],
] as const;

const OPTIONS: readonly OptionSpec[] = [
  {
    key: "max-count",
    short: "n",
    long: "max-count",
    value: "required",
    numeric: true,
  },
  { key: "oneline", long: "oneline", negatable: false },
  { key: "decorate", long: "decorate", value: "optional" },
  ...UNSIMULATED.map(([long, short, value]) => ({
    key: `x-${long}`,
    ...(long.length > 1 ? { long } : {}),
    ...(short ? { short } : {}),
    ...(value
      ? {
          value:
            value === "optional"
              ? ("optional" as const)
              : ("required" as const),
        }
      : {}),
  })),
];

const indent = (message: string) =>
  message
    .replace(/\n$/, "")
    .split("\n")
    .map((line) => `    ${line}\n`)
    .join("");

export const log = defineCommand({
  name: "log",
  counted: false,
  needsRepo: true,
  usage: `usage: git log [<options>] [<revision-range>] [[--] <path>...]
   or: git show [<options>] <object>...`,
  options: OPTIONS,
  run: ({ world, repo, options }) => {
    const unsupported = [...options.values.keys()].find((k) =>
      k.startsWith("x-"),
    );
    if (unsupported) {
      const name = unsupported.slice(2);
      return refuse(
        "not-simulated",
        notSimulated(`git log ${name.length > 1 ? "--" : "-"}${name}`),
        1,
      );
    }
    if (options.args.length) {
      return refuse(
        "not-simulated",
        notSimulated("git log with revisions or paths"),
        1,
      );
    }
    const countValue = lastValue(options, "max-count");
    let limit = Infinity;
    if (typeof countValue === "string") {
      if (!/^-?\d+$/.test(countValue)) {
        return refuse("usage", `fatal: '${countValue}': not an integer\n`);
      }
      const n = Number(countValue);
      limit = n < 0 ? Infinity : n;
    }
    const head = resolveHead(repo);
    if (!head) {
      const branch =
        repo.head.kind === "symbolic" ? shortRefName(repo.head.ref) : "HEAD";
      return refuse(
        "unborn-branch",
        `fatal: your current branch '${branch}' does not have any commits yet\n`,
      );
    }
    const decorate = lastValue(options, "decorate");
    if (
      typeof decorate === "string" &&
      decorate !== "short" &&
      decorate !== "no"
    ) {
      return refuse(
        "not-simulated",
        notSimulated(`git log --decorate=${decorate}`),
        1,
      );
    }
    const decorated = decorate !== false && decorate !== "no";
    const oneline = lastValue(options, "oneline") === true;
    const label = (oid: Parameters<typeof decorations>[1]) => {
      const names = decorated ? decorations(repo, oid) : [];
      return names.length ? ` (${names.join(", ")})` : "";
    };
    const lines: LineRef[] = [];
    let row = 0;
    const blocks = walkCommits(world.objects, [head], repo.arrival, limit).map(
      ({ oid, commit }) => {
        lines.push({ line: row, oid });
        const subject = subjectOf(commit.message);
        const text = oneline
          ? `${abbreviate(world.objects, oid)}${label(oid)} ${subject}\n`
          : `commit ${oid}${label(oid)}\nAuthor: ${commit.author.name} <${commit.author.email}>\nDate:   ${formatGitDate(commit.author.time, commit.author.tz)}\n\n${indent(commit.message)}`;
        row += text.split("\n").length - 1 + (oneline ? 0 : 1);
        return text;
      },
    );
    return { stdout: blocks.join(oneline ? "" : "\n"), lines };
  },
});
