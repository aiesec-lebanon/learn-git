import type { Session } from "@/engine";
import { Button } from "@/ui/button";
import type { PausedMerge } from "./model";

/** The paused merge or rebase, with Git's ways out: continue, skip (rebase) or abort. */
export function Ribbon({
  session,
  paused,
}: {
  session: Session;
  paused: PausedMerge;
}) {
  const left = paused.files.length;
  const verb = paused.kind;
  const done =
    verb === "merge"
      ? "Every file is marked resolved. Continue to make the merge commit."
      : "Every file is marked resolved. Continue to record this commit and replay the rest.";
  return (
    <div className="grid gap-2 rounded-sm border-2 border-dashed border-st-conflict bg-st-conflict-bg p-3">
      <p className="m-0 text-sm">
        <strong>{verb === "merge" ? "Merge paused" : "Rebase paused"}</strong> (
        {paused.message}).{" "}
        {left
          ? `${left} file${left === 1 ? "" : "s"} still unmerged. Resolve, then mark each one resolved with git add.`
          : done}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={left ? "secondary" : "primary"}
          onClick={() => session.run(`git ${verb} --continue`)}
        >
          Continue: <code>git {verb} --continue</code>
        </Button>
        {verb === "rebase" ? (
          <Button onClick={() => session.run("git rebase --skip")}>
            Skip: <code>git rebase --skip</code>
          </Button>
        ) : null}
        <Button onClick={() => session.run(`git ${verb} --abort`)}>
          Abort: <code>git {verb} --abort</code>
        </Button>
      </div>
    </div>
  );
}
