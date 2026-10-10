import { flag, type OptionSpec } from "../cli/options";
import {
  changedPairs,
  commitSnapshot,
  diffForm,
  indexSnapshot,
  worktreeSnapshot,
  type Snapshot,
} from "../diff/forms";
import { diffFormat, FORMAT_OPTIONS, renderDiff } from "../diff/render";
import { notSimulated } from "../messages/git";
import { resolveHead } from "../refs/refs";
import { revisionInput } from "../revisions/args";
import type { Oid } from "../types";
import { defineCommand, refuse } from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const OPTIONS: readonly OptionSpec[] = [
  { key: "staged", long: "staged", negatable: false },
  { key: "staged", long: "cached", negatable: false },
  ...FORMAT_OPTIONS,
  x("raw"),
  x("numstat"),
  x("shortstat"),
  x("dirstat", "X", "optional"),
  x("summary"),
  x("name-status"),
  x("patch-with-stat"),
  x("patch-with-raw"),
  x("unified", "U", "required"),
  x("word-diff", undefined, "optional"),
  x("color-words", undefined, "optional"),
  x("color", undefined, "optional"),
  x("ignore-all-space", "w"),
  x("ignore-space-change", "b"),
  x("ignore-space-at-eol"),
  x("ignore-blank-lines"),
  x("find-renames", "M", "optional"),
  x("find-copies", "C", "optional"),
  x("R", "R"),
  x("text", "a"),
  x("function-context", "W"),
  x("exit-code"),
  x("quiet"),
  x("no-index"),
  x("merge-base"),
  x("check"),
  x("relative", undefined, "optional"),
  x("diff-filter", undefined, "required"),
  x("full-index"),
  x("binary"),
  x("abbrev", undefined, "optional"),
  x("minimal"),
  x("patience"),
  x("histogram"),
  x("diff-algorithm", undefined, "required"),
  x("output", undefined, "required"),
  x("z", "z"),
];

export const diff = defineCommand({
  name: "diff",
  counted: false,
  needsRepo: true,
  usage: `usage: git diff [<options>] [<commit>] [--] [<path>...]
   or: git diff [<options>] --cached [--merge-base] [<commit>] [--] [<path>...]
   or: git diff [<options>] [--merge-base] <commit> [<commit>...] <commit> [--] [<path>...]
   or: git diff [<options>] <commit>...<commit> [--] [<path>...]
   or: git diff [<options>] <blob> <blob>
   or: git diff [<options>] --no-index [--] <path> <path>`,
  options: OPTIONS,
  run: ({ world, machine, repo, options }) => {
    const pool = world.objects;
    const unsupported = refuseUnsimulated("diff", options);
    if (unsupported) return unsupported;
    const input = revisionInput(pool, repo, machine, options);
    if (!("specs" in input)) return input;
    const oids = input.revisions.map((r) => r.oid);
    if (oids.length > 2) {
      return refuse(
        "not-simulated",
        notSimulated("git diff with more than two commits"),
        1,
      );
    }
    if (oids.some((oid) => pool.get(oid)?.type !== "commit")) {
      return refuse(
        "not-simulated",
        notSimulated("git diff of trees or blobs"),
        1,
      );
    }
    const commit = (oid: Oid | undefined) => commitSnapshot(pool, oid ?? null);
    const pick: Record<
      ReturnType<typeof diffForm>,
      () => [Snapshot, Snapshot]
    > = {
      unstaged: () => [
        indexSnapshot(pool, repo),
        worktreeSnapshot(repo, machine.fs),
      ],
      staged: () => [
        commit(oids[0] ?? resolveHead(repo) ?? undefined),
        indexSnapshot(pool, repo),
      ],
      commit: () => [commit(oids[0]), worktreeSnapshot(repo, machine.fs)],
      commits: () => [commit(oids[0]), commit(oids[1])],
    };
    const [before, after] =
      pick[diffForm(flag(options, "staged"), oids.length)]();
    const pairs = changedPairs(before, after, input.specs);
    return { stdout: renderDiff(pool, pairs, diffFormat(options, "patch")) };
  },
});
