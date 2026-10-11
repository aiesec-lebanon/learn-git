import {
  createWorld,
  DIFF_FORMS,
  discoverRepo,
  firstParentChain,
  machineOf,
  resolveHead,
  runLine,
  subjectOf,
  type Commit,
  type DiffArea,
  type World,
} from "@/engine";
import { bakeSaleThreeChanges } from "@/content/worlds/bake-sale";

export type LensSnapshot = {
  readonly id: string;
  readonly label: string;
  readonly area: DiffArea;
  /** How Git names a commit snapshot, e.g. `HEAD~1`. */
  readonly rev?: string;
};

/** The snapshots the lens offers, oldest first: each commit on HEAD's line, the staging area, the working tree. */
export function lensSnapshots(world: World): readonly LensSnapshot[] | null {
  const repo = discoverRepo(world, machineOf(world));
  if (!repo) return null;
  const tip = resolveHead(repo);
  const chain = tip ? firstParentChain(world.objects, tip) : [];
  const commits = chain.map((oid, i): LensSnapshot => {
    const back = chain.length - 1 - i;
    const rev = back === 0 ? "HEAD" : `HEAD~${back}`;
    const subject = subjectOf((world.objects.get(oid) as Commit).message);
    return { id: rev, label: `${rev}: ${subject}`, area: "commit", rev };
  });
  return [
    ...commits,
    { id: "index", label: "Staging area", area: "index" },
    { id: "worktree", label: "Working tree", area: "worktree" },
  ];
}

/**
 * The `git diff` line that compares two snapshots, older side first (the
 * order of `snapshots`), or null for the same snapshot twice.
 */
export function lensCommand(
  snapshots: readonly LensSnapshot[],
  a: string,
  b: string,
): string | null {
  const ia = snapshots.findIndex((s) => s.id === a);
  const ib = snapshots.findIndex((s) => s.id === b);
  if (ia < 0 || ib < 0 || ia === ib) return null;
  const [from, to] = (ia < ib ? [ia, ib] : [ib, ia]).map(
    (i) => snapshots[i] as LensSnapshot,
  ) as [LensSnapshot, LensSnapshot];
  const form = Object.values(DIFF_FORMS).find(
    (f) => f.from === from.area && f.to === to.area,
  );
  if (!form) return null;
  if (form === DIFF_FORMS.staged)
    return from.rev === "HEAD" ? form.form : `${form.form} ${from.rev}`;
  const revs = [from.rev, to.rev].filter((r) => r !== undefined);
  return revs.reduce<string>(
    (line, rev) => line.replace("<commit>", rev),
    form.form,
  );
}

/** What the command prints in this world; the world itself is left as it is. */
export function lensOutput(world: World, command: string): string {
  const outcome = runLine(world, command).outcomes.at(-1);
  return outcome?.output.stdout ?? "";
}

export type AnatomyPart = "header" | "hunk" | "removed" | "added" | "context";

export const ANATOMY: Readonly<
  Record<AnatomyPart, { readonly label: string; readonly meaning: string }>
> = {
  header: {
    label: "File header",
    meaning:
      "Which file changed. a/ is the older side and b/ the newer one; the index line holds both short blob IDs.",
  },
  hunk: {
    label: "Hunk header",
    meaning:
      "@@ -1,5 +1,5 @@ means: from line 1, five lines of the old file became five lines of the new one.",
  },
  removed: {
    label: "Removed line",
    meaning: "A line starting with - is in the older side only.",
  },
  added: {
    label: "Added line",
    meaning: "A line starting with + is in the newer side only.",
  },
  context: {
    label: "Context",
    meaning: "Unchanged lines around the change, so you can find the spot.",
  },
};

export function anatomyPart(line: string): AnatomyPart {
  if (/^(diff |index |--- |\+\+\+ )/.test(line)) return "header";
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("-")) return "removed";
  if (line.startsWith("+")) return "added";
  return "context";
}

export type DiffLine = { readonly text: string; readonly part: AnatomyPart };

/** Diff output split into lines, each with its part; empty output gives no lines. */
export function diffLines(output: string): DiffLine[] {
  const text = output.replace(/\n$/, "");
  return text
    ? text.split("\n").map((line) => ({ text: line, part: anatomyPart(line) }))
    : [];
}

let sample: readonly DiffLine[] | null = null;

/** The lemon cake price fix as `git diff` prints it, line by line with its part. */
export function anatomySample(): readonly DiffLine[] {
  sample ??= diffLines(
    lensOutput(createWorld(bakeSaleThreeChanges), "git diff menu.html"),
  );
  return sample;
}
