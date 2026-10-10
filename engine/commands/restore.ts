import { flag, lastValue, type OptionSpec } from "../cli/options";
import { addMessages } from "../messages/add";
import { parsePathspecs } from "../pathspec";
import { applyRestore, sourceFiles } from "../restore/apply";
import { resolveRevision } from "../revisions/resolve";
import { defineCommand, refuse } from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const OPTIONS: readonly OptionSpec[] = [
  { key: "source", short: "s", long: "source", value: "required" },
  { key: "staged", short: "S", long: "staged" },
  { key: "worktree", short: "W", long: "worktree" },
  { key: "quiet", short: "q", long: "quiet" },
  x("patch", "p"),
  x("ours"),
  x("theirs"),
  x("merge", "m"),
  x("conflict", undefined, "required"),
  x("overlay"),
  x("ignore-unmerged"),
  x("ignore-skip-worktree-bits"),
  x("recurse-submodules"),
  x("progress"),
  x("pathspec-from-file", undefined, "required"),
];

export const restore = defineCommand({
  name: "restore",
  counted: true,
  needsRepo: true,
  usage: "usage: git restore [<options>] [--source=<branch>] <file>...",
  options: OPTIONS,
  run: ({ world, machine, repo, options }) => {
    const unsupported = refuseUnsimulated("restore", options);
    if (unsupported) return unsupported;
    if (!options.args.length) {
      return refuse("usage", "fatal: you must specify path(s) to restore\n");
    }
    const staged = flag(options, "staged");
    const worktree = flag(options, "worktree") || !staged;
    const named = lastValue(options, "source");
    const from =
      typeof named === "string" ? named : staged ? "HEAD" : undefined;
    let source: ReturnType<typeof sourceFiles> = null;
    if (from !== undefined) {
      const resolved = resolveRevision(world.objects, repo, from);
      source = resolved.ok ? sourceFiles(world, resolved.oid) : null;
      if (!source) {
        return refuse("unknown-revision", `fatal: could not resolve ${from}\n`);
      }
    }
    const parsed = parsePathspecs(options.args, repo.workdir, machine.cwd);
    if (!parsed.ok) {
      return refuse(
        "outside-repository",
        addMessages.outside(parsed.outside, repo.workdir),
      );
    }
    return applyRestore(world, repo, machine, {
      source,
      staged,
      worktree,
      overlay: false,
      strict: true,
      specs: parsed.specs,
    });
  },
});
