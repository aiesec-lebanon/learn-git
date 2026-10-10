import type { ParsedOptions } from "../cli/options";
import { resolvePath } from "../files/paths";
import { revisionMessages as m } from "../messages/revisions";
import type { Machine, ObjectPool, Oid, Repo } from "../types";
import { resolveRevision } from "./resolve";

export type RevisionArgs =
  | {
      readonly ok: true;
      readonly revisions: readonly { text: string; oid: Oid }[];
      readonly paths: readonly string[];
    }
  | { readonly ok: false; readonly stderr: string };

const GLOB = /[*?[]/;

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
      const prefix =
        resolved.reason === "ambiguous-id" ? m.ambiguousId(text) : "";
      if (afterDashDash !== null) {
        return { ok: false, stderr: prefix + m.badRevision(text) };
      }
      for (let j = i; j < args.length; j++) {
        const arg = args[j] ?? "";
        if (GLOB.test(arg) || exists(arg)) continue;
        const stderr = j === i ? prefix + m.unknown(arg) : m.noSuchPath(arg);
        return { ok: false, stderr };
      }
      return { ok: true, revisions, paths: args.slice(i) };
    }
    if (afterDashDash === null && exists(text)) {
      return { ok: false, stderr: m.both(text) };
    }
    if (!pool.has(resolved.oid)) {
      return { ok: false, stderr: m.badObject(text) };
    }
    revisions.push({ text, oid: resolved.oid });
  }
  return { ok: true, revisions, paths: args.slice(revisionEnd) };
}
