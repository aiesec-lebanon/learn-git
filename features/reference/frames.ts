import { createWorld, Session, type World } from "@/engine";
import type { ReferenceEntry, ReferencePreset } from "@/content/define";
import { stageFrame, type StageFrame } from "@/features/stage/frame";
import { transcriptOf, type TranscriptLine } from "@/features/stage/transcript";
import { frameKey } from "./key";

/** A command's before and after, with what Git printed. */
export type ReferenceFrame = {
  readonly before: StageFrame;
  readonly after: StageFrame;
  readonly transcript: readonly TranscriptLine[];
};

export function presetWorld(preset: ReferencePreset): World {
  const session = new Session(createWorld(preset.world));
  for (const line of preset.setup ?? []) session.run(line);
  return session.getSnapshot().world;
}

export function referenceFrame(world: World, command: string): ReferenceFrame {
  const session = new Session(world);
  const entries = session.run(command);
  return {
    before: stageFrame(world, []),
    after: stageFrame(
      session.getSnapshot().world,
      entries.flatMap((e) => e.outcome.effects),
    ),
    transcript: transcriptOf(entries),
  };
}

/** Every preset and form of an entry, built at build time. */
export function entryFrames(
  entry: ReferenceEntry,
): Record<string, ReferenceFrame> {
  const frames: Record<string, ReferenceFrame> = {};
  for (const preset of entry.presets) {
    const world = presetWorld(preset);
    for (const variant of entry.variants)
      frames[frameKey(preset.id, variant.id)] = referenceFrame(
        world,
        variant.command,
      );
  }
  return frames;
}
