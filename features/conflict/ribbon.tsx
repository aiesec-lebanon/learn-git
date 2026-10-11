import type { Session } from "@/engine";
import { Button } from "@/ui/button";
import type { PausedMerge } from "./model";

/** The paused merge, with Git's two ways out: continue or abort. */
export function Ribbon({
  session,
  paused,
}: {
  session: Session;
  paused: PausedMerge;
}) {
  const left = paused.files.length;
  return (
    <div className="grid gap-2 rounded-sm border-2 border-dashed border-st-conflict bg-st-conflict-bg p-3">
      <p className="m-0 text-sm">
        <strong>Merge paused</strong> ({paused.message}).{" "}
        {left
          ? `${left} file${left === 1 ? "" : "s"} still unmerged. Resolve, then mark each one resolved with git add.`
          : "Every file is marked resolved. Continue to make the merge commit."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={left ? "secondary" : "primary"}
          onClick={() => session.run("git merge --continue")}
        >
          Continue: <code>git merge --continue</code>
        </Button>
        <Button onClick={() => session.run("git merge --abort")}>
          Abort: <code>git merge --abort</code>
        </Button>
      </div>
    </div>
  );
}
