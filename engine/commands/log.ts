import { flag, lastValue, type OptionSpec } from "../cli/options";
import { diffFormat, FORMAT_OPTIONS, renderDiff } from "../diff/render";
import {
  commitChanges,
  commitEntry,
  HEADER_OPTIONS,
  headerStyle,
  unbornRefusal,
} from "../log/format";
import { drawGraph, topoOrder } from "../log/graph";
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
  { key: "all", long: "all", negatable: false },
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
  { key: "topo-order", long: "topo-order", negatable: false },
  x("date-order"),
  x("walk-reflogs", "g"),
  x("skip", undefined, "required"),
  x("relative-date"),
  x("parents"),
  x("raw"),
  x("word-diff", undefined, "optional"),
  x("show-signature"),
];

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
    const named = input.revisions.map((r) => r.oid);
    const all = flag(options, "all")
      ? [...repo.refs.values(), ...(head ? [head] : [])]
      : [];
    const starts = [...new Set([...named, ...all])].filter(
      (oid) => pool.get(oid)?.type === "commit",
    );
    if (!starts.length && head) starts.push(head);
    const graph = flag(options, "graph");
    const topo = graph || flag(options, "topo-order");
    const paths = input.specs.length > 0;
    let walked = walkCommits(
      pool,
      starts,
      repo.arrival,
      topo && !paths ? Infinity : limit,
      paths ? pathSimplifier(pool, input.specs) : undefined,
    );
    if (topo && !paths) walked = topoOrder(walked).slice(0, limit);
    const merges = walked.some((w) => w.commit.parents.length > 1);
    if (graph && paths && (merges || starts.length > 1)) {
      return refuse(
        "not-simulated",
        notSimulated("git log --graph with paths and merges"),
        1,
      );
    }
    if (graph && walked.some((w) => w.commit.parents.length > 2)) {
      return refuse(
        "not-simulated",
        notSimulated("git log --graph with octopus merges"),
        1,
      );
    }
    const format = diffFormat(options, "none");
    const texts = walked.map(({ oid, commit }) => {
      const changes =
        commit.parents.length > 1
          ? ""
          : renderDiff(pool, commitChanges(pool, commit, input.specs), format);
      return commitEntry(pool, repo, { oid, commit }, style, changes);
    });
    if (graph) {
      const drawn = drawGraph(
        walked.map(({ oid, commit }, i) => ({
          oid,
          parents: paths
            ? walked.slice(i + 1, i + 2).map((w) => w.oid)
            : commit.parents,
          lines: (texts[i] ?? "").replace(/\n$/, "").split("\n"),
        })),
        !style.oneline,
      );
      return {
        stdout: drawn.text,
        lines: drawn.rows.map((line, i) => ({
          line,
          oid: walked[i]?.oid as Oid,
        })),
      };
    }
    const lines: LineRef[] = [];
    let row = 0;
    const blocks = texts.map((entry, i) => {
      lines.push({ line: row, oid: walked[i]?.oid as Oid });
      const text =
        !style.oneline && i < texts.length - 1 ? `${entry}\n` : entry;
      row += text.split("\n").length - 1;
      return text;
    });
    return { stdout: blocks.join(""), lines };
  },
});
