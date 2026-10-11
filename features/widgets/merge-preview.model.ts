import {
  reachableFrom,
  type MergePreview,
  type Oid,
  type World,
} from "@/engine";
import type { RepoView } from "@/features/graph/view-model";

/** Where the current branch ends up after a merge, or a guess at it. */
export type Landing =
  | { readonly kind: "commit"; readonly oid: Oid }
  | { readonly kind: "new" }
  | { readonly kind: "paused" }
  | { readonly kind: "none" };

export type MergeNames = {
  /** The branch HEAD is on. */
  readonly branch: string;
  /** The branch being merged in. */
  readonly name: string;
  readonly short: (oid: Oid) => string;
};

export function landing(preview: MergePreview): Landing {
  switch (preview.kind) {
    case "up-to-date":
      return { kind: "commit", oid: preview.head };
    case "fast-forward":
      return { kind: "commit", oid: preview.to };
    case "merge":
      return preview.conflicts.length ? { kind: "paused" } : { kind: "new" };
    default:
      return { kind: "none" };
  }
}

/** Git's default message: "into <branch>" is left out for main and master. */
export const mergeMessage = (branch: string, name: string) =>
  `Merge branch '${name}'${branch === "main" || branch === "master" ? "" : ` into ${branch}`}`;

const list = (paths: readonly string[]) =>
  paths.length === 1
    ? paths[0]
    : `${paths.slice(0, -1).join(", ")} and ${paths.at(-1)}`;

/** What `git merge` would do, in one paragraph. `forced` is a fast-forward made a merge by --no-ff. */
export function outcomeText(
  preview: MergePreview,
  { branch, name, short }: MergeNames,
  forced = false,
): string {
  switch (preview.kind) {
    case "unknown":
      return `Git knows no branch or commit called ${name}.`;
    case "unborn":
      return `${branch} has no commit yet, so there is nothing to merge into.`;
    case "unrelated":
      return `${branch} and ${name} share no history, so Git refuses: "refusing to merge unrelated histories".`;
    case "criss-cross":
      return `${branch} and ${name} have more than one merge base. This preview stops there.`;
    case "up-to-date":
      return `Already up to date: ${branch} already reaches every commit on ${name}, so nothing changes.`;
    case "fast-forward":
      return `Fast-forward: ${branch} has nothing new of its own, so its label slides from ${short(preview.from)} to ${short(preview.to)}. No new commit.`;
    case "merge":
      if (preview.conflicts.length) {
        return `Conflict: both sides changed ${list(preview.conflicts)} since ${short(preview.base)}. Git stops before committing and asks you to decide.`;
      }
      return forced
        ? `--no-ff: a fast-forward was possible, but Git records a merge commit with two parents anyway, "${mergeMessage(branch, name)}".`
        : `Merge commit: both branches moved on since ${short(preview.base)}, so Git combines the three snapshots in a new commit with two parents, "${mergeMessage(branch, name)}".`;
  }
}

const sameLanding = (a: Landing, b: Landing) =>
  a.kind === b.kind && (a.kind !== "commit" || a.oid === (b as typeof a).oid);

const guessText = (guess: Landing, short: (oid: Oid) => string) =>
  guess.kind === "commit" ? `on ${short(guess.oid)}` : "on a new commit";

/** The prediction set beside the real outcome; ungraded, only the reason differs. */
export function comparisonText(
  guess: Landing | null,
  preview: MergePreview,
  names: MergeNames,
): string {
  const actual = landing(preview);
  const { branch, short } = names;
  const result =
    actual.kind === "commit"
      ? `${branch} lands on ${short(actual.oid)}.`
      : actual.kind === "new"
        ? `${branch} moves onto a new merge commit.`
        : actual.kind === "paused"
          ? `${branch} stays where it is until you resolve the conflict.`
          : "";
  const outcome = `${result} ${outcomeText(preview, names)}`.trim();
  if (!guess || actual.kind === "none") return outcome;
  const opener = sameLanding(guess, actual)
    ? `You expected ${branch} ${guessText(guess, short)}, and so does Git.`
    : `You expected ${branch} ${guessText(guess, short)}.`;
  return `${opener} ${outcome}`;
}

/** The commits `git merge <name>` would bring into the current branch. */
export function broughtIn(world: World, view: RepoView, name: string) {
  const tip = view.labels.find((l) => l.ref === `refs/heads/${name}`)?.target;
  const kept = reachableFrom(
    world.objects,
    view.head.target ? [view.head.target] : [],
  );
  return new Set(
    [...reachableFrom(world.objects, tip ? [tip] : [])].filter(
      (oid) => !kept.has(oid),
    ),
  );
}
