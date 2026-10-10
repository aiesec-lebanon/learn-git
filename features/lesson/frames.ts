import { createWorld, Session } from "@/engine";
import type { LessonScene } from "@/content/define";
import { stageFrame, type StageFrame } from "@/features/stage/frame";

export type TranscriptLine = {
  readonly command: string;
  readonly stdout: string;
  readonly stderr: string;
};

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
    const entries = (beat.run ?? []).flatMap((line) => session.run(line));
    return {
      id: beat.id,
      stage: stageFrame(
        session.getSnapshot().world,
        entries.flatMap((e) => e.outcome.effects),
      ),
      transcript: entries.map((e) => ({
        command: e.text,
        stdout: e.outcome.output.stdout,
        stderr: e.outcome.output.stderr,
      })),
    };
  });
}
