import { relativeTo, resolvePath } from "./files/paths";
import type { RepoPath } from "./types";

export type Pathspec = {
  readonly original: string;
  /** Repository-relative; "" is the whole worktree. */
  readonly path: string;
  readonly regex: RegExp | null;
};

const GLOB = /[*?[]/;

function globRegex(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i] ?? "";
    if (c === "*") out += ".*";
    else if (c === "?") out += ".";
    else if (c === "[") {
      const close = pattern.indexOf("]", i + 2);
      if (close < 0) out += "\\[";
      else {
        const body = pattern.slice(i + 1, close);
        const negate = body.startsWith("!") || body.startsWith("^");
        out += `[${negate ? "^" : ""}${(negate ? body.slice(1) : body).replace(/[\\\]^]/g, "\\$&")}]`;
        i = close;
      }
    } else out += c.replace(/[.+^${}()|\\/]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

/**
 * Git pathspecs relative to `cwd`: a path, a folder, or a glob whose `*`
 * also matches `/`. Returns the offending argument when one lies outside.
 */
export function parsePathspecs(
  args: readonly string[],
  workdir: string,
  cwd: string,
): { ok: true; specs: Pathspec[] } | { ok: false; outside: string } {
  const specs: Pathspec[] = [];
  for (const original of args) {
    const path = relativeTo(workdir, resolvePath(cwd, original));
    if (path === null) return { ok: false, outside: original };
    specs.push({
      original,
      path,
      regex: GLOB.test(path) ? globRegex(path) : null,
    });
  }
  return { ok: true, specs };
}

export function matchesPathspec(
  spec: Pathspec,
  path: RepoPath | string,
): boolean {
  if (spec.path === "") return true;
  if (spec.regex) return spec.regex.test(path);
  return path === spec.path || path.startsWith(`${spec.path}/`);
}
