import type { ParsedOptions } from "../cli/options";
import { refuse, type CommandResult } from "../commands/registry";
import { resolvePath } from "../files/paths";
import { addMessages } from "../messages/add";
import { notSimulated } from "../messages/git";
import { revisionMessages as m } from "../messages/revisions";
import { parsePathspecs, type Pathspec } from "../pathspec";
import type { Machine, ObjectPool, Oid, Repo } from "../types";
import { resolveRevision } from "./resolve";

export type RevisionArgs =
  | {
      readonly ok: true;
      readonly revisions: readonly { text: string; oid: Oid }[];
      readonly paths: readonly string[];
    }
  | {
      readonly ok: false;
      readonly stderr: string;
      readonly code: "unknown-revision" | "not-simulated";
    };

const GLOB = /[*?[]/;
const RANGE = /^\^.|\.\./;

/**
 * Splits arguments into revisions and paths as Git's `setup_revisions`
 * does: before `--` every argument must be a revision; without `--` a
 * revision must not also name a file, and the first argument that is not
 * a revision starts the paths, which must then exist.
 */
export function revisionArgs(
  pool: ObjectPool,
  repo: Repo,
  machine: Machine,
  options: ParsedOptions,
): RevisionArgs {
  const { args, afterDashDash } = options;
  const exists = (arg: string) => {
    const path = resolvePath(machine.cwd, arg);
    return machine.fs.files.has(path) || machine.fs.dirs.has(path);
  };
  const revisionEnd = afterDashDash ?? args.length;
  const revisions: { text: string; oid: Oid }[] = [];
  for (let i = 0; i < revisionEnd; i++) {
    const text = args[i] ?? "";
    const resolved = resolveRevision(pool, repo, text);
    if (!resolved.ok) {
      if (
        RANGE.test(text) &&
        !text.split("/").includes("..") &&
        !exists(text)
      ) {
        return {
          ok: false,
          stderr: notSimulated("revision ranges"),
          code: "not-simulated",
        };
      }
      const prefix =
        resolved.reason === "ambiguous-id" ? m.ambiguousId(text) : "";
      if (afterDashDash !== null) {
        return {
          ok: false,
          stderr: prefix + m.badRevision(text),
          code: "unknown-revision",
        };
      }
      for (let j = i; j < args.length; j++) {
        const arg = args[j] ?? "";
        if (GLOB.test(arg) || exists(arg)) continue;
        const stderr = j === i ? prefix + m.unknown(arg) : m.noSuchPath(arg);
        return { ok: false, stderr, code: "unknown-revision" };
      }
      return { ok: true, revisions, paths: args.slice(i) };
    }
    if (afterDashDash === null && exists(text)) {
      return { ok: false, stderr: m.both(text), code: "unknown-revision" };
    }
    if (!pool.has(resolved.oid)) {
      return {
        ok: false,
        stderr: m.badObject(text),
        code: "unknown-revision",
      };
    }
    revisions.push({ text, oid: resolved.oid });
  }
  return { ok: true, revisions, paths: args.slice(revisionEnd) };
}

export type RevisionInput = {
  readonly revisions: readonly { text: string; oid: Oid }[];
  readonly specs: readonly Pathspec[];
};

/** Revisions and pathspecs for `diff`, `show` and `log`, or Git's refusal. */
export function revisionInput(
  pool: ObjectPool,
  repo: Repo,
  machine: Machine,
  options: ParsedOptions,
): RevisionInput | CommandResult {
  const split = revisionArgs(pool, repo, machine, options);
  if (!split.ok) {
    return split.code === "not-simulated"
      ? refuse(split.code, split.stderr, 1)
      : refuse(split.code, split.stderr);
  }
  const parsed = parsePathspecs(split.paths, repo.workdir, machine.cwd);
  if (!parsed.ok) {
    return refuse(
      "outside-repository",
      addMessages.outside(parsed.outside, repo.workdir),
    );
  }
  return { revisions: split.revisions, specs: parsed.specs };
}
