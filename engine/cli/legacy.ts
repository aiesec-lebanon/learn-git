import { refuse, defineCommand } from "../commands/registry";
import { refuseUnsimulated, unsimulated as x } from "../commands/unsimulated";
import { resolvePath } from "../files/paths";
import { quotePath } from "../files/quote";
import { resolveIdentity } from "../config/identity";
import { appendReflog } from "../refs/reflog";
import { addMessages } from "../messages/add";
import { notSimulated } from "../messages/git";
import { parsePathspecs } from "../pathspec";
import { resolveHead } from "../refs/refs";
import { applyRestore, sourceFiles } from "../restore/apply";
import { revisionMessages } from "../messages/revisions";
import { resolveRevision } from "../revisions/resolve";
import { computeStatus } from "../status/compute";
import type { Machine, Repo, World } from "../types";
import { repoOf, withRepo } from "../world/access";
import { flag, type ParsedOptions } from "./options";
import { shellQuote } from "./tokenize";

export const older = (modern: string, paths: readonly string[]) =>
  `Older form of: git restore ${modern}${paths.map(shellQuote).join(" ") || "."}`;

/** `[<commit>] [--] <paths>`: the commit when the first argument names one. */
function commitAndPaths(
  world: World,
  repo: Repo,
  machine: Machine,
  options: ParsedOptions,
) {
  const { args, afterDashDash } = options;
  const [first] = args;
  if (afterDashDash === 0 || first === undefined) {
    return { commit: null, paths: args };
  }
  const resolved = resolveRevision(world.objects, repo, first);
  const file = resolvePath(machine.cwd, first);
  const isFile = machine.fs.files.has(file) || machine.fs.dirs.has(file);
  if (afterDashDash === 1 || (resolved.ok && !isFile)) {
    return { commit: first, paths: args.slice(1) };
  }
  return { commit: null, paths: args };
}

export function specsFor(
  repo: Repo,
  machine: Machine,
  paths: readonly string[],
) {
  return parsePathspecs(
    paths.length ? paths : [repo.workdir],
    repo.workdir,
    machine.cwd,
  );
}

export const outside = (repo: Repo, arg: string) =>
  refuse("outside-repository", addMessages.outside(arg, repo.workdir));

/** Legacy `git reset [-q] [HEAD] [--] [<paths>]`: unstage, like `restore --staged`. */
export const reset = defineCommand({
  name: "reset",
  counted: true,
  needsRepo: true,
  legacy: true,
  usage: `usage: git reset [--mixed | --soft | --hard | --merge | --keep] [-q] [<commit>]
   or: git reset [-q] [<tree-ish>] [--] <pathspec>...`,
  options: [
    { key: "quiet", short: "q", long: "quiet" },
    x("mixed"),
    x("soft"),
    x("hard"),
    x("merge"),
    x("keep"),
    x("patch", "p"),
    x("intent-to-add", "N"),
    x("pathspec-from-file", undefined, "required"),
  ],
  run: ({ world, machine, repo, options, time }) => {
    const unsupported = refuseUnsimulated("reset", options);
    if (unsupported) return unsupported;
    const { commit, paths } = commitAndPaths(world, repo, machine, options);
    const head = resolveHead(repo);
    const resolved =
      commit === null ? null : resolveRevision(world.objects, repo, commit);
    if (resolved && !resolved.ok) {
      return refuse("unknown-revision", revisionMessages.unknown(commit ?? ""));
    }
    const oid = resolved ? resolved.oid : head;
    if (!paths.length && oid !== head) {
      return refuse(
        "not-simulated",
        notSimulated("git reset to another commit (yet)"),
        1,
      );
    }
    const parsed = specsFor(repo, machine, paths);
    if (!parsed.ok) return outside(repo, parsed.outside);
    const result = applyRestore(world, repo, machine, {
      source: (oid && sourceFiles(world, oid)) || new Map(),
      staged: true,
      worktree: false,
      overlay: false,
      strict: false,
      specs: parsed.specs,
    });
    let after = repoOf(result.world ?? world, repo.id);
    const identity = resolveIdentity(world, machine, repo);
    if (!paths.length && head && identity.ok) {
      after = appendReflog(after, "HEAD", {
        old: head,
        new: head,
        who: { ...identity.ident, time, tz: "+0000" },
        message: `reset: moving to ${commit ?? "HEAD"}`,
      });
    }
    const unstaged = computeStatus(world.objects, after, machine.fs).unstaged;
    const stdout =
      unstaged.length && !flag(options, "quiet")
        ? `Unstaged changes after reset:\n${unstaged
            .map(
              (c) =>
                `${c.kind === "deleted" ? "D" : "M"}\t${quotePath(c.path)}\n`,
            )
            .join("")}`
        : "";
    const modern = commit && commit !== "HEAD" ? `--source=${commit} ` : "";
    return {
      ...result,
      world: withRepo(result.world ?? world, after),
      stdout,
      notes: [older(`${modern}--staged `, paths)],
    };
  },
});
