import {
  abbreviate,
  discoverRepo,
  machineOf,
  runLine,
  shortRefName,
  type Effect,
  type Outcome,
  type World,
} from "@/engine";
import { repoView, type RepoView } from "@/features/graph/view-model";

/** One previewed command: what it would print and leave, never recorded. */
export type Preview = {
  readonly command: string;
  readonly outcome: string;
  readonly view: RepoView | null;
  readonly ok: boolean;
};

function viewOf(world: World): RepoView | null {
  const repo = discoverRepo(world, machineOf(world));
  return repo ? repoView(world, repo) : null;
}

/** What a fetch, pull or push did, in one plain sentence. */
export function outcomeText(
  world: World,
  outcomes: readonly Outcome[],
): string {
  const effects: Effect[] = outcomes.flatMap((o) => [...o.effects]);
  const last = outcomes.at(-1);
  const id = (oid: string | null) =>
    oid ? abbreviate(world.objects, oid as never) : "nothing";
  const refused = effects.find((e) => e.kind === "refused");
  if (refused?.kind === "refused") {
    if (refused.code === "divergent-branches")
      return "Git stops and asks how to combine: both sides have new commits.";
    if (last?.output.stderr.includes("Not possible to fast-forward"))
      return "Git refuses: the branches diverged, so a fast-forward is impossible.";
  }
  const conflict = effects.find((e) => e.kind === "conflict");
  if (conflict?.kind === "conflict")
    return `Stops on a conflict in ${conflict.paths.join(", ")}; you resolve it, then continue.`;
  const rebase = effects.find(
    (e) =>
      e.kind === "operation" &&
      e.operation === "rebase" &&
      e.phase === "finished",
  );
  if (rebase)
    return "Replays your commits on top of origin's: no merge commit, a straight line.";
  const merge = effects.find(
    (e) => e.kind === "object-written" && e.type === "commit",
  );
  if (merge?.kind === "object-written") {
    const commit = world.objects.get(merge.oid);
    if (commit?.type === "commit" && commit.parents.length > 1)
      return `Makes merge commit ${id(merge.oid)}, joining your work and origin's.`;
  }
  const moved = effects.filter((e) => e.kind === "ref-updated");
  const local = moved.find(
    (e) => e.kind === "ref-updated" && e.ref.startsWith("refs/heads/"),
  );
  const remote = moved.filter(
    (e) => e.kind === "ref-updated" && e.ref.startsWith("refs/remotes/"),
  );
  if (local?.kind === "ref-updated")
    return `${shortRefName(local.ref)} fast-forwards to ${id(local.to)}; your files update too.`;
  if (remote.length)
    return `${remote.map((e) => (e.kind === "ref-updated" ? shortRefName(e.ref) : "")).join(", ")} moves; your branch and files stay as they were.`;
  return last?.output.stdout.includes("Already up to date")
    ? "Already up to date: nothing to bring in."
    : "Nothing changes: origin has nothing new.";
}

/** Runs `command` on a copy of the world (the engine is pure). */
export function preview(world: World, command: string): Preview {
  const ran = runLine(world, command);
  return {
    command,
    outcome: outcomeText(ran.world, ran.outcomes),
    view: viewOf(ran.world),
    ok: ran.outcomes.every((o) => o.output.exitCode === 0),
  };
}

/** The comparator: one start, a fetch and a pull side by side (B5.2). */
export function fetchVsPull(world: World): readonly [Preview, Preview] {
  return [preview(world, "git fetch"), preview(world, "git pull")];
}

/** The pull-mode chooser: the three ways to reconcile, previewed from here. */
export const PULL_MODES = [
  { label: "Merge", command: "git pull --no-rebase" },
  { label: "Rebase", command: "git pull --rebase" },
  { label: "Fast-forward only", command: "git pull --ff-only" },
] as const;

export function pullModes(world: World): readonly Preview[] {
  return PULL_MODES.map((m) => preview(world, m.command));
}
