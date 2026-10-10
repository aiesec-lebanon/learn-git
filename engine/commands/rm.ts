import { flag, type OptionSpec } from "../cli/options";
import { resolvePath } from "../files/paths";
import { removeFilePruning, worktreeFiles } from "../files/worktree";
import { addMessages } from "../messages/add";
import { rmMessages as m } from "../messages/tracking";
import { hashObject } from "../objects/hash";
import { readObject } from "../objects/pool";
import { flattenTree } from "../objects/tree";
import { matchesPathspec, parsePathspecs } from "../pathspec";
import { resolveHead } from "../refs/refs";
import { stagedEntry, unstagePath } from "../staging/index";
import type { Effect, PathChange, Repo, RepoPath, World } from "../types";
import { compareBytes } from "../util/compare";
import { withMachine, withRepo } from "../world/access";
import { defineCommand, refuse } from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const OPTIONS: readonly OptionSpec[] = [
  { key: "cached", long: "cached" },
  { key: "force", short: "f", long: "force" },
  { key: "recursive", short: "r" },
  { key: "quiet", short: "q", long: "quiet" },
  x("dry-run", "n"),
  x("ignore-unmatch"),
  x("sparse"),
  x("pathspec-from-file", undefined, "required"),
  x("pathspec-file-nul"),
];

function headFiles(world: World, repo: Repo) {
  const head = resolveHead(repo);
  return head
    ? flattenTree(world.objects, readObject(world.objects, head, "commit").tree)
    : null;
}

export const rm = defineCommand({
  name: "rm",
  counted: true,
  needsRepo: true,
  usage: `usage: git rm [-f | --force] [-n] [-r] [--cached] [--ignore-unmatch]
              [--quiet] [--pathspec-from-file=<file> [--pathspec-file-nul]]
              [--] [<pathspec>...]`,
  options: OPTIONS,
  run: ({ world, machine, repo, options }) => {
    const unsupported = refuseUnsimulated("rm", options);
    if (unsupported) return unsupported;
    if (!options.args.length) return refuse("usage", m.noPathspec());
    const parsed = parsePathspecs(options.args, repo.workdir, machine.cwd);
    if (!parsed.ok) {
      return refuse(
        "outside-repository",
        addMessages.outside(parsed.outside, repo.workdir),
      );
    }
    const cached = flag(options, "cached");
    const tracked = [...repo.index.keys()].sort(compareBytes);
    const selected = new Set<RepoPath>();
    for (const spec of parsed.specs) {
      const matched = tracked.filter((p) => matchesPathspec(spec, p));
      if (!matched.length)
        return refuse("pathspec-no-match", addMessages.noMatch(spec.original));
      if (
        !flag(options, "recursive") &&
        !spec.regex &&
        matched.some((p) => p !== spec.path)
      )
        return refuse("not-recursive", m.notRecursive(spec.original));
      for (const p of matched) selected.add(p);
    }
    const paths = [...selected].sort(compareBytes);
    const files = worktreeFiles(machine.fs, repo.workdir);

    if (!flag(options, "force")) {
      const head = headFiles(world, repo);
      const both: string[] = [];
      const staged: string[] = [];
      const local: string[] = [];
      for (const path of paths) {
        const content = files.get(path);
        const entry = stagedEntry(repo.index, path);
        if (content === undefined || !entry) continue;
        const isLocal = hashObject({ type: "blob", content }) !== entry.oid;
        const isStaged = head?.get(path)?.oid !== entry.oid;
        if (isLocal && isStaged) both.push(path);
        else if (!cached) {
          if (isStaged) staged.push(path);
          if (isLocal) local.push(path);
        }
      }
      const errors = [
        both.length ? m.stagedDiffers(both) : "",
        staged.length ? m.stagedChanges(staged) : "",
        local.length ? m.localChanges(local) : "",
      ].join("");
      if (errors) return refuse("would-lose-changes", errors, 1);
    }

    let index = repo.index;
    let fs = machine.fs;
    const indexChanges: PathChange[] = [];
    const fileChanges: (PathChange & { node: "file" | "dir" })[] = [];
    for (const path of paths) {
      index = unstagePath(index, path);
      indexChanges.push({ path, change: "deleted" });
      if (cached || !files.has(path)) continue;
      const absolute = resolvePath(repo.workdir, path);
      const removed = removeFilePruning(fs, absolute, repo.workdir);
      fs = removed.fs;
      fileChanges.push({ path: absolute, change: "deleted", node: "file" });
      for (const dir of removed.removedDirs)
        fileChanges.push({ path: dir, change: "deleted", node: "dir" });
    }
    const effects: Effect[] = [
      {
        kind: "index-changed",
        repo: repo.id,
        from: "worktree",
        changes: indexChanges,
      },
    ];
    if (fileChanges.length)
      effects.push({
        kind: "files-changed",
        machine: machine.id,
        changes: fileChanges,
      });
    const next = withRepo(world, { ...repo, index });
    return {
      world: fs === machine.fs ? next : withMachine(next, { ...machine, fs }),
      stdout: flag(options, "quiet") ? "" : paths.map(m.removed).join(""),
      effects,
    };
  },
});
