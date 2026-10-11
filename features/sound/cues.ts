import type { Effect, HistoryEntry } from "@/engine";
import type { SoundCue } from "@/themes/contract";

const paused = (e: Effect) => e.kind === "operation" && e.phase === "paused";

/** The cue for one learner entry; refusals, reading commands and teammates' work are silent. */
export function cueFor({ outcome, actor }: HistoryEntry): SoundCue | null {
  const { effects, world, output, meta } = outcome;
  if (actor !== undefined) return null;
  if (output.exitCode !== 0 && !effects.some(paused)) return null;
  if (effects.some((e) => e.kind === "conflict")) return "conflict";
  if (
    effects.some(
      (e) => e.kind === "hub" && e.event.type === "pull-request-merged",
    )
  )
    return "merge";
  const commits = effects.flatMap((e) => {
    if (e.kind !== "object-written" || e.type !== "commit") return [];
    const object = world.objects.get(e.oid);
    return object?.type === "commit" ? [object] : [];
  });
  if (commits.some((c) => c.parents.length > 1)) return "merge";
  const movedBranch = effects.some(
    (e) => e.kind === "ref-updated" && e.ref.startsWith("refs/heads/"),
  );
  if (
    (meta.command === "git merge" || meta.command === "git pull") &&
    movedBranch
  )
    return "merge";
  return commits.length > 0 ? "commit" : null;
}
