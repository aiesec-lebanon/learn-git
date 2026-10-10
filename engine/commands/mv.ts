import { flag, type OptionSpec } from "../cli/options";
import { baseName, parentOf, relativeTo, resolvePath } from "../files/paths";
import { removeFile, writeFile } from "../files/worktree";
import { mvMessages as m } from "../messages/tracking";
import { stagedEntry, stageEntry, unstagePath } from "../staging/index";
import type { Effect, Fs, Index, PathChange, RepoPath } from "../types";
import { compareBytes } from "../util/compare";
import { withMachine, withRepo } from "../world/access";
import { defineCommand, refuse } from "./registry";
import { refuseUnsimulated, unsimulated as x } from "./unsimulated";

const USAGE = `usage: git mv [<options>] <source>... <destination>

    -v, --[no-]verbose    be verbose
    -n, --[no-]dry-run    dry run
    -f, --[no-]force      force move/rename even if target exists
    -k                    skip move/rename errors
    --[no-]sparse         allow updating entries outside of the sparse-checkout cone`;

const OPTIONS: readonly OptionSpec[] = [
  { key: "force", short: "f", long: "force" },
  x("verbose", "v"),
  x("dry-run", "n"),
  x("k", "k"),
  x("sparse"),
];

/** Every path at or below `dir` in a set of paths (`dir` itself included). */
const under = (paths: Iterable<string>, dir: string) =>
  [...paths].filter((p) => p === dir || p.startsWith(`${dir}/`));

type Move = { readonly from: string; readonly to: string };

export const mv = defineCommand({
  name: "mv",
  counted: true,
  needsRepo: true,
  usage: USAGE,
  options: OPTIONS,
  run: ({ world, machine, repo, options }) => {
    const unsupported = refuseUnsimulated("mv", options);
    if (unsupported) return unsupported;
    const args = options.args;
    if (args.length < 2) return refuse("usage", `${USAGE}\n\n`, 129);
    const force = flag(options, "force");
    const { fs } = machine;
    const abs = (rel: string) => resolvePath(repo.workdir, rel);
    const rel = (arg: string) =>
      relativeTo(repo.workdir, resolvePath(machine.cwd, arg));

    const named: string[] = [];
    for (const arg of args) {
      const path = rel(arg);
      if (path === null || path === "")
        return refuse("outside-repository", m.outside(arg, repo.workdir));
      named.push(path);
    }
    const target = named.pop() as string;
    const sources = named;
    const intoDir = fs.dirs.has(abs(target));
    if (sources.length > 1 && !intoDir)
      return refuse("usage", m.notDirectory(args.at(-1) ?? target));

    const tracked = [...repo.index.keys()];
    const moves: Move[] = [];
    for (const source of sources) {
      const destination = intoDir
        ? `${target}/${baseName(abs(source))}`
        : target;
      const fail = (
        reason: string,
        code: "pathspec-no-match" | "not-tracked" | "destination-exists",
      ) => refuse(code, m.failed(reason, source, destination));
      const isDir = fs.dirs.has(abs(source));
      if (!isDir && !fs.files.has(abs(source)))
        return fail("bad source", "pathspec-no-match");
      if (isDir) {
        if (!under(tracked, source).length)
          return fail("source directory is empty", "pathspec-no-match");
        if (fs.dirs.has(abs(destination)) || fs.files.has(abs(destination)))
          return fail("destination already exists", "destination-exists");
      } else {
        if (!repo.index.has(source as RepoPath))
          return fail("not under version control", "not-tracked");
        if (fs.files.has(abs(destination)) && !force)
          return fail("destination exists", "destination-exists");
        if (fs.dirs.has(abs(destination)))
          return fail("destination exists", "destination-exists");
      }
      if (!fs.dirs.has(parentOf(abs(destination))))
        return refuse("no-such-directory", m.renameFailed(source));
      moves.push({ from: source, to: destination });
    }

    let index: Index = repo.index;
    let files: Fs = fs;
    const indexChanges: PathChange[] = [];
    const fileChanges: (PathChange & { node: "file" | "dir" })[] = [];
    for (const { from, to } of moves) {
      const rename = (p: string) => `${to}${p.slice(from.length)}`;
      for (const path of under(tracked, from).sort(compareBytes)) {
        const entry = stagedEntry(index, path as RepoPath);
        if (!entry) continue;
        const next = rename(path) as RepoPath;
        const replaced = index.has(next);
        index = stageEntry(unstagePath(index, path as RepoPath), {
          ...entry,
          path: next,
        });
        indexChanges.push({ path, change: "deleted" });
        indexChanges.push({
          path: next,
          change: replaced ? "modified" : "added",
        });
      }
      for (const [path, content] of [...files.files]) {
        const r = relativeTo(repo.workdir, path);
        if (r === null || under([r], from).length === 0) continue;
        const next = abs(rename(r));
        const existed = files.files.has(next);
        files = writeFile(removeFile(files, path), next, content);
        fileChanges.push({ path, change: "deleted", node: "file" });
        fileChanges.push({
          path: next,
          change: existed ? "modified" : "added",
          node: "file",
        });
      }
      const moved = [...files.dirs].filter((d) => {
        const r = relativeTo(repo.workdir, d);
        return r !== null && r !== "" && under([r], from).length > 0;
      });
      if (moved.length) {
        const dirs = new Set(files.dirs);
        for (const d of moved) {
          dirs.delete(d);
          dirs.add(abs(rename(relativeTo(repo.workdir, d) ?? "")));
        }
        files = { files: files.files, dirs };
      }
    }
    for (const d of files.dirs)
      if (!fs.dirs.has(d))
        fileChanges.push({ path: d, change: "added", node: "dir" });
    for (const d of fs.dirs)
      if (!files.dirs.has(d))
        fileChanges.push({ path: d, change: "deleted", node: "dir" });
    const effects: Effect[] = [];
    if (indexChanges.length)
      effects.push({
        kind: "index-changed",
        repo: repo.id,
        from: "worktree",
        changes: indexChanges,
      });
    if (fileChanges.length)
      effects.push({
        kind: "files-changed",
        machine: machine.id,
        changes: fileChanges,
      });
    return {
      world: withMachine(withRepo(world, { ...repo, index }), {
        ...machine,
        fs: files,
      }),
      effects,
    };
  },
});
