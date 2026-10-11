import { ZERO_OID } from "../objects/hash";
import { signatureLine } from "../objects/serialize";
import type { ReflogEntry, Repo } from "../types";
import { withEntry } from "../util/cow";

/** One reflog line as Git writes it in `.git/logs/<ref>`. */
export function reflogLine(entry: ReflogEntry): string {
  return `${entry.old ?? ZERO_OID} ${entry.new ?? ZERO_OID} ${signatureLine(entry.who)}\t${entry.message}`;
}

/** Reflogs are kept for HEAD, the stash, local and remote-tracking branches. */
export function keepsReflog(key: string): boolean {
  return (
    key === "HEAD" ||
    key === "refs/stash" ||
    key.startsWith("refs/heads/") ||
    key.startsWith("refs/remotes/")
  );
}

export function appendReflog(
  repo: Repo,
  key: string,
  entry: ReflogEntry,
): Repo {
  if (!keepsReflog(key)) return repo;
  const log = repo.reflogs.get(key) ?? [];
  return { ...repo, reflogs: withEntry(repo.reflogs, key, [...log, entry]) };
}
