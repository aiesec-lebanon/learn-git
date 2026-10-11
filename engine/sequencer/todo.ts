import { commitSnapshot, changedPairs } from "../diff/forms";
import { diffHunks } from "../diff/unified";
import { diffContents } from "../diff/numstat";
import { readObject } from "../objects/pool";
import { reachableFrom } from "../reachability";
import type { ObjectPool, Oid } from "../types";

/**
 * A commit's patch ID in spirit (`git patch-id`): its changes per path,
 * with hunk positions and whitespace ignored, so a cherry-picked copy on
 * another base matches the original.
 */
export function patchId(pool: ObjectPool, oid: Oid): string {
  const commit = readObject(pool, oid, "commit");
  const parent = commit.parents[0] ?? null;
  const pairs = changedPairs(
    commitSnapshot(pool, parent),
    commitSnapshot(pool, oid),
  );
  return pairs
    .map((pair) => {
      const diff = diffContents(
        pair.before?.content ?? null,
        pair.after?.content ?? null,
      );
      const body =
        diff.kind === "text"
          ? diffHunks(diff.a, diff.b, diff.keptA, diff.keptB)
              .flatMap((h) => h.lines.filter((l) => l.sign !== " "))
              .map((l) => `${l.sign}${l.text.replace(/\s+/g, "")}`)
              .join("\n")
          : `${pair.before?.oid}..${pair.after?.oid}`;
      return `${pair.from ?? pair.path}\0${pair.path}\0${body}`;
    })
    .join("\0\0");
}

/** Commits `from` reaches and `exclude` does not, oldest first (parents before children). */
function onlyIn(pool: ObjectPool, from: Oid, exclude: Oid): Oid[] {
  const excluded = reachableFrom(pool, [exclude]);
  const out: Oid[] = [];
  const seen = new Set<Oid>();
  const visit = (start: Oid) => {
    const stack: [Oid, boolean][] = [[start, false]];
    while (stack.length) {
      const [oid, expanded] = stack.pop() as [Oid, boolean];
      if (expanded) {
        out.push(oid);
        continue;
      }
      if (seen.has(oid) || excluded.has(oid)) continue;
      seen.add(oid);
      stack.push([oid, true]);
      const parents = readObject(pool, oid, "commit").parents;
      for (const parent of [...parents].reverse()) stack.push([parent, false]);
    }
  };
  visit(from);
  return out;
}

export type RebaseTodo = {
  /** Commits to replay, oldest first. */
  readonly picks: readonly Oid[];
  /** Commits whose change `upstream` already has (skipped, with a warning). */
  readonly skipped: readonly Oid[];
};

/**
 * What a non-interactive rebase replays: the non-merge commits in
 * `upstream..head`, minus those whose patch `head..upstream` already has.
 */
export function rebaseTodo(
  pool: ObjectPool,
  upstream: Oid,
  head: Oid,
): RebaseTodo {
  const mine = onlyIn(pool, head, upstream).filter(
    (oid) => readObject(pool, oid, "commit").parents.length <= 1,
  );
  const theirs = new Set(
    onlyIn(pool, upstream, head)
      .filter((oid) => readObject(pool, oid, "commit").parents.length <= 1)
      .map((oid) => patchId(pool, oid)),
  );
  const picks: Oid[] = [];
  const skipped: Oid[] = [];
  for (const oid of mine) {
    (theirs.size && theirs.has(patchId(pool, oid)) ? skipped : picks).push(oid);
  }
  return { picks, skipped };
}
