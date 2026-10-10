import { flag, lastValue, type OptionSpec } from "../cli/options";
import {
  commitHeader,
  HEADER_OPTIONS,
  headerStyle,
  unbornRefusal,
} from "../log/format";
import { walkCommits } from "../log/walk";
import { notSimulated } from "../messages/git";
import { resolveHead } from "../refs/refs";
import type { LineRef } from "../types";
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
  x("all"),
  x("stat"),
  x("shortstat"),
  x("numstat"),
  x("name-only"),
  x("name-status"),
  x("patch", "p"),
  x("u", "u"),
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
  run: ({ world, repo, options }) => {
    const unsupported = refuseUnsimulated("log", options);
    if (unsupported) return unsupported;
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
    if (!head) return unbornRefusal(repo);
    const style = headerStyle("log", options);
    if (!("oneline" in style)) return style;
    const walked = walkCommits(world.objects, [head], repo.arrival, limit);
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
      let text = commitHeader(world.objects, repo, oid, commit, style);
      if (!style.oneline && i < walked.length - 1) text += "\n";
      if (graph) text = linearGraph(text, commit.parents.length > 0);
      row += text.split("\n").length - 1;
      return text;
    });
    return { stdout: blocks.join(""), lines };
  },
});
