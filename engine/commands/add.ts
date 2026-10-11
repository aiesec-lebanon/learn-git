import { flag, type OptionSpec } from "../cli/options";
import { resolvePath } from "../files/paths";
import { isGitPath, worktreeFiles } from "../files/worktree";
import { ignoreRules } from "../ignore/rules";
import { addMessages as m } from "../messages/add";
import { notSimulated } from "../messages/git";
import { writeObjects } from "../objects/write";
import { matchesPathspec, parsePathspecs, type Pathspec } from "../pathspec";
import { stageEntry, stagedEntry, unstagePath } from "../staging/index";
import type { Effect, GitObject, Index, PathChange, RepoPath } from "../types";
import { compareBytes } from "../util/compare";
import { hashObject } from "../objects/hash";
import { withRepo } from "../world/access";
import { defineCommand, refuse } from "./registry";

const unsimulated = (long: string, short?: string, value?: "required") => ({
  key: `x-${long}`,
  long,
  ...(short ? { short } : {}),
  ...(value ? { value } : {}),
});

/**
 * What Git names when a literal pathspec reaches an ignored path: the
 * topmost excluded folder that holds no tracked file, or the file itself.
 */
function ignoredTarget(
  spec: Pathspec,
  index: Index,
  isDir: (path: string) => boolean,
  ignored: (path: string, isDir: boolean) => boolean,
): string | null {
  if (spec.regex || spec.path === "" || index.has(spec.path as RepoPath))
    return null;
  const parts = spec.path.split("/");
  for (let i = 1; i <= parts.length; i++) {
    const path = parts.slice(0, i).join("/");
    const dir = i < parts.length || isDir(path);
    if (dir && [...index.keys()].some((p) => p.startsWith(`${path}/`)))
      continue;
    return ignored(path, dir) ? path : null;
  }
  return null;
}

const OPTIONS: readonly OptionSpec[] = [
  { key: "all", short: "A", long: "all" },
  { key: "all", long: "no-ignore-removal", negatable: false },
  { key: "update", short: "u", long: "update" },
  { key: "force", short: "f", long: "force" },
  unsimulated("dry-run", "n"),
  unsimulated("verbose", "v"),
  unsimulated("interactive", "i"),
  unsimulated("patch", "p"),
  unsimulated("edit", "e"),
  unsimulated("intent-to-add", "N"),
  unsimulated("ignore-removal"),
  unsimulated("refresh"),
  unsimulated("ignore-errors"),
  unsimulated("ignore-missing"),
  unsimulated("renormalize"),
  unsimulated("sparse"),
  unsimulated("chmod", undefined, "required"),
  unsimulated("pathspec-from-file", undefined, "required"),
];

export const add = defineCommand({
  name: "add",
  counted: true,
  needsRepo: true,
  usage: "usage: git add [<options>] [--] <pathspec>...",
  options: OPTIONS,
  run: ({ world, machine, repo, options }) => {
    const unsupported = [...options.values.keys()].find((k) =>
      k.startsWith("x-"),
    );
    if (unsupported) {
      return refuse(
        "not-simulated",
        notSimulated(`git add --${unsupported.slice(2)}`),
        1,
      );
    }
    const all = flag(options, "all");
    const update = flag(options, "update");
    if (all && update) return refuse("usage", m.incompatible("-A", "-u"));
    if (options.args.length === 0 && !all && !update) {
      return { stderr: m.nothingSpecified() };
    }
    const parsed = parsePathspecs(options.args, repo.workdir, machine.cwd);
    if (!parsed.ok) {
      return refuse(
        "outside-repository",
        m.outside(parsed.outside, repo.workdir),
      );
    }
    const files = worktreeFiles(machine.fs, repo.workdir);
    const known = [...new Set([...files.keys(), ...repo.index.keys()])].sort(
      compareBytes,
    );
    for (const spec of parsed.specs) {
      const matched =
        isGitPath(spec.path) ||
        machine.fs.dirs.has(resolvePath(repo.workdir, spec.path)) ||
        known.some((p) => matchesPathspec(spec, p));
      if (!matched)
        return refuse("pathspec-no-match", m.noMatch(spec.original));
    }
    const force = flag(options, "force");
    const rules = ignoreRules(files);
    const isDir = (path: string) =>
      machine.fs.dirs.has(resolvePath(repo.workdir, path));
    const refused = force
      ? []
      : parsed.specs.flatMap((s) => {
          const target = ignoredTarget(s, repo.index, isDir, rules.ignored);
          return target === null ? [] : [target];
        });
    const inScope = (path: string) =>
      parsed.specs.length === 0 ||
      parsed.specs.some((s) => matchesPathspec(s, path));
    let index: Index = repo.index;
    const blobs: GitObject[] = [];
    const changes: PathChange[] = [];
    for (const path of known.filter(inScope) as RepoPath[]) {
      const content = files.get(path);
      const tracked = index.has(path);
      if (content === undefined) {
        index = unstagePath(index, path);
        changes.push({ path, change: "deleted" });
        continue;
      }
      if (!tracked && (update || (!force && rules.ignored(path)))) continue;
      const blob: GitObject = { type: "blob", content };
      const oid = hashObject(blob);
      const staged = stagedEntry(index, path);
      if (staged?.oid === oid && index.get(path)?.length === 1) continue;
      blobs.push(blob);
      index = stageEntry(index, { path, oid, mode: "100644", stage: 0 });
      changes.push({ path, change: tracked ? "modified" : "added" });
    }
    const written = writeObjects(world, repo.id, blobs);
    const effects: Effect[] = [...written.effects];
    if (changes.length)
      effects.push({
        kind: "index-changed",
        repo: repo.id,
        from: "worktree",
        changes,
      });
    const next = withRepo(written.world, { ...repo, index });
    if (!refused.length) return { world: next, effects };
    return {
      world: next,
      stderr: m.ignored([...new Set(refused)]),
      exitCode: 1,
      effects: [...effects, { kind: "refused", code: "path-ignored" }],
    };
  },
});
