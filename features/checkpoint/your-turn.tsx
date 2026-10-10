import { createWorld } from "@/engine";
import type { Checkpoint as CheckpointSpec } from "@/content/define";
import { stageFrame } from "@/features/stage/frame";
import { Checkpoint } from "./checkpoint";

/** The Your turn section of a lesson; its start state is rendered at build time. */
export function YourTurn({
  sessionKey,
  checkpoint,
}: {
  sessionKey: string;
  checkpoint: CheckpointSpec;
}) {
  return (
    <section aria-labelledby="your-turn" className="border-t border-line py-10">
      <h2 id="your-turn" className="m-0 text-3xl font-bold">
        Your turn
      </h2>
      <p className="mt-3 mb-6 max-w-prose font-display text-xl">
        {checkpoint.goal}
      </p>
      <Checkpoint
        sessionKey={sessionKey}
        world={checkpoint.world}
        target={checkpoint.target}
        start={stageFrame(createWorld(checkpoint.world), [])}
      />
    </section>
  );
}
