import { flag, lastValue, type OptionSpec } from "../cli/options";
import { diffFormat, FORMAT_OPTIONS, renderDiff } from "../diff/render";
import {
  commitChanges,
  commitEntry,
  HEADER_OPTIONS,
  headerStyle,
  unbornRefusal,
} from "../log/format";
import { pathSimplifier } from "../log/simplify";
import { walkCommits } from "../log/walk";
import { notSimulated } from "../messages/git";
import { resolveHead } from "../refs/refs";
import { revisionInput } from "../revisions/args";
import type { LineRef, Oid } from "../types";
import { defineCommand, refuse } from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const OPTIONS: readonly OptionSpec[] = [
  {
    key: "max-count",
    short: "n",
    long: "max-count",
    value: "required",
    numeric: true,
  },
  ...HEADER_OPTIONS,
  { key: "graph", long: "graph", negatable: false },
  ...FORMAT_OPTIONS,
  x("all"),
  x("shortstat"),
  x("numstat"),
  x("name-status"),
  x("author", undefined, "required"),
  x("committer", undefined, "required"),
  x("grep", undefined, "required"),
  x("since", undefined, "required"),
  x("until", undefined, "required"),
  x("after", undefined, "required"),
  x("before", undefined, "required"),
  x("S", "S", "required"),
  x("G", "G", "required"),
  x("L", "L", "required"),
  x("follow"),
  x("first-parent"),
  x("reverse"),
  x("pretty", undefined, "optional"),
  x("format", undefined, "required"),
  x("abbrev-commit"),
  x("abbrev", undefined, "optional"),
  x("date", undefined, "required"),
  x("merges"),
  x("no-merges"),
  x("branches", undefined, "optional"),
  x("tags", undefined, "optional"),
  x("remotes", undefined, "optional"),
  x("source"),
  x("color", undefined, "optional"),
  x("topo-order"),
  x("date-order"),
  x("walk-reflogs", "g"),
  x("skip", undefined, "required"),
  x("relative-date"),
  x("parents"),
  x("raw"),
  x("word-diff", undefined, "optional"),
  x("show-signature"),
];

/** Linear `--graph`: `* ` on the commit line, `| ` below it while a parent follows. */
function linearGraph(block: string, hasParent: boolean): string {
  const rail = hasParent ? "| " : "  ";
  return block
    .replace(/\n$/, "")
    .split("\n")
    .map((row, i) => `${i === 0 ? "* " : rail}${row}\n`)
    .join("");
}

export const log = defineCommand({
  name: "log",
  counted: false,
  needsRepo: true,
  usage: `usage: git log [<options>] [<revision-range>] [[--] <path>...]
   or: git show [<options>] <object>...`,
  options: OPTIONS,
  run: ({ world, machine, repo, options }) => {
    const pool = world.objects;
    const unsupported = refuseUnsimulated("log", options);
    if (unsupported) return unsupported;
    const countValue = lastValue(options, "max-count");
    let limit = Infinity;
    if (typeof countValue === "string") {
      if (!/^-?\d+$/.test(countValue)) {
        return refuse("usage", `fatal: '${countValue}': not an integer\n`);
      }
      const n = Number(countValue);
      limit = n < 0 ? Infinity : n;
    }
    const style = headerStyle("log", options);
    if (!("oneline" in style)) return style;
    const input = revisionInput(pool, repo, machine, options);
    if (!("specs" in input)) return input;
    const head = resolveHead(repo);
    if (!input.revisions.length && !head) return unbornRefusal(repo);
    const starts = input.revisions.length
      ? input.revisions.map((r) => r.oid)
      : [head as Oid];
    const walked = walkCommits(
      pool,
      [...new Set(starts)].filter((oid) => pool.get(oid)?.type === "commit"),
      repo.arrival,
      limit,
      input.specs.length ? pathSimplifier(pool, input.specs) : undefined,
    );
    const format = diffFormat(options, "none");
    const graph = flag(options, "graph");
    if (graph && walked.some((w) => w.commit.parents.length > 1)) {
      return refuse(
        "not-simulated",
        notSimulated("git log --graph with merges"),
        1,
      );
    }
    const lines: LineRef[] = [];
    let row = 0;
    const blocks = walked.map(({ oid, commit }, i) => {
      lines.push({ line: row, oid });
      const changes =
        commit.parents.length > 1
          ? ""
          : renderDiff(pool, commitChanges(pool, commit, input.specs), format);
      let text = commitEntry(pool, repo, { oid, commit }, style, changes);
      if (!style.oneline && i < walked.length - 1) text += "\n";
      if (graph) text = linearGraph(text, commit.parents.length > 0);
      row += text.split("\n").length - 1;
      return text;
    });
    return { stdout: blocks.join(""), lines };
  },
});
