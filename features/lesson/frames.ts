import { createWorld, Session } from "@/engine";
import { runStep, type LessonScene } from "@/content/define";
import { stageFrame, type StageFrame } from "@/features/stage/frame";
import { transcriptOf, type TranscriptLine } from "@/features/stage/transcript";

/** What the pinned stage shows for one beat, as plain JSON. */
export type BeatFrame = {
  readonly id: string;
  readonly stage: StageFrame;
  readonly transcript: readonly TranscriptLine[];
};

/** Replays the scene beat by beat; pages run it at build time. */
export function beatFrames(scene: LessonScene): BeatFrame[] {
  const session = new Session(createWorld(scene.world));
  return scene.beats.map((beat) => {
    const entries = (beat.run ?? []).flatMap((step) => runStep(session, step));
    return {
      id: beat.id,
      stage: stageFrame(
        session.getSnapshot().world,
        entries.flatMap((e) => e.outcome.effects),
      ),
      transcript: transcriptOf(entries),
    };
  });
}
