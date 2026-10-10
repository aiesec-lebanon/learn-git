import { createWorld } from "@/engine";
import type { Checkpoint as CheckpointSpec } from "@/content/define";
import { stageFrame } from "@/features/stage/frame";
import { Checkpoint } from "./checkpoint";
import type { Reached } from "./sandbox";

/** The Your turn section of a lesson; its start state is rendered at build time. */
export function YourTurn({
  sessionKey,
  checkpoint,
  reached,
}: {
  sessionKey: string;
  checkpoint: CheckpointSpec;
  reached: Reached;
}) {
  return (
    <section aria-labelledby="your-turn" className="border-t border-line py-10">
      <h2
        id="your-turn"
        tabIndex={-1}
        className="m-0 scroll-mt-24 text-3xl font-bold"
      >
        Your turn
      </h2>
      <p className="mt-3 mb-6 max-w-prose font-display text-xl">
        {checkpoint.goal}
      </p>
      <Checkpoint
        sessionKey={sessionKey}
        reached={reached}
        world={checkpoint.world}
        target={checkpoint.target}
        hints={checkpoint.hints}
        start={stageFrame(createWorld(checkpoint.world), [])}
      />
    </section>
  );
}
