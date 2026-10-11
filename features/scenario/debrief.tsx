import type { HistoryEntry } from "@/engine";
import type { ScenarioScene } from "@/content/define";
import { YourPath } from "@/features/checkpoint/your-path";

const WRITE = /^echo -ne '.*' > '?([^']+?)'?$/;

/** An expert's line as the learner would type it: file writes read as edits. */
export const shownLine = (line: string) => {
  const file = WRITE.exec(line)?.[1];
  return file ? `edit ${file}` : line;
};

/** Your path beside the experts' paths and their trade-offs; nothing is scored. */
export function Debrief({
  scene,
  history,
}: {
  scene: ScenarioScene;
  history: readonly HistoryEntry[];
}) {
  return (
    <section
      aria-labelledby="debrief"
      className="grid gap-3 rounded-sm bg-accent-soft p-3"
    >
      <h3 id="debrief" className="m-0 font-display text-lg font-semibold">
        Debrief
      </h3>
      <p className="m-0 text-sm">
        You got there. Compare your path with the ways an experienced teammate
        might have gone.
      </p>
      <YourPath history={history} />
      {scene.experts.map((expert) => (
        <details key={expert.title} className="text-sm">
          <summary className="min-h-11 cursor-pointer content-center font-semibold">
            {expert.title} ({expert.solution.length} commands)
          </summary>
          <ol className="m-0 grid gap-1 pl-5">
            {expert.solution.map((line, i) => (
              <li key={i}>
                <code className="font-mono">{shownLine(line)}</code>
              </li>
            ))}
          </ol>
          <p className="m-0 mt-2">{expert.tradeoffs}</p>
        </details>
      ))}
    </section>
  );
}
