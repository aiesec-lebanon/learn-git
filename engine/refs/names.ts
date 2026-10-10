import type { RefName } from "../types";

const FORBIDDEN = /[\x00-\x20\x7f~^:?*[\\]/;

/** Git's ref name rules (git-check-ref-format) for a full ref name. */
export function isValidRefName(name: string): boolean {
  if (name === "@" || name.includes("..") || name.includes("@{")) return false;
  if (FORBIDDEN.test(name) || name.endsWith(".") || name.endsWith("/")) {
    return false;
  }
  const parts = name.split("/");
  return parts.every(
    (part) => part !== "" && !part.startsWith(".") && !part.endsWith(".lock"),
  );
}

/** A valid branch name: a valid `refs/heads/<name>` that does not start with `-`. */
export function isValidBranchName(name: string): boolean {
  return (
    !name.startsWith("-") &&
    name !== "HEAD" &&
    isValidRefName(`refs/heads/${name}`)
  );
}

export function branchRef(name: string): RefName {
  return `refs/heads/${name}` as RefName;
}

const SHORT_PREFIXES = ["refs/heads/", "refs/tags/", "refs/remotes/"];

/** `refs/heads/main` reads `main`, `refs/remotes/origin/main` reads `origin/main`. */
export function shortRefName(ref: string): string {
  const prefix = SHORT_PREFIXES.find((p) => ref.startsWith(p));
  return prefix ? ref.slice(prefix.length) : ref;
}
