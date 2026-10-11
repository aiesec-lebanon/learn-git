import type { Effect, Oid, RefName, ReflogEntry, Repo } from "../types";
import { withEntry, withoutEntry } from "../util/cow";

export const STASH_REF = "refs/stash" as RefName;

/** Stash entries, newest (`stash@{0}`) first. */
export function stashEntries(repo: Repo): ReflogEntry[] {
  return [...(repo.reflogs.get(STASH_REF) ?? [])].reverse();
}

export type StashPick = {
  readonly index: number;
  readonly oid: Oid;
  /** How Git names it in `Dropped ...`: as typed, or `refs/stash@{0}`. */
  readonly label: string;
};

/** The entry `stash@{n}` or `n` names (`stash@{0}` when omitted). */
export function pickStash(
  repo: Repo,
  name: string | undefined,
): StashPick | "empty" | "invalid" {
  const entries = stashEntries(repo);
  if (!entries.length) return "empty";
  const match =
    name === undefined ? ["", "0"] : /^(?:stash@\{)?(\d+)\}?$/.exec(name);
  const index = Number(match?.[1] ?? NaN);
  const entry = entries[index];
  if (!match || !entry?.new) return "invalid";
  return {
    index,
    oid: entry.new,
    label: name ?? `${STASH_REF}@{${index}}`,
  };
}

/**
 * Removes one entry (`git reflog delete --updateref --rewrite`): the ref
 * moves to the newest remaining entry, or goes when none is left.
 */
export function dropStash(
  repo: Repo,
  index: number,
): { repo: Repo; effects: Effect[] } {
  const kept = stashEntries(repo)
    .filter((_, i) => i !== index)
    .reverse()
    .map((e, i, all) => ({ ...e, old: i ? (all[i - 1]?.new ?? null) : null }));
  const from = repo.refs.get(STASH_REF) ?? null;
  const top = kept.at(-1)?.new ?? null;
  const next: Repo = top
    ? {
        ...repo,
        refs: withEntry(repo.refs, STASH_REF, top),
        reflogs: withEntry(repo.reflogs, STASH_REF, kept),
      }
    : {
        ...repo,
        refs: withoutEntry(repo.refs, STASH_REF),
        reflogs: withoutEntry(repo.reflogs, STASH_REF),
      };
  const effects: Effect[] =
    from === top
      ? []
      : [{ kind: "ref-updated", repo: repo.id, ref: STASH_REF, from, to: top }];
  return { repo: next, effects };
}
