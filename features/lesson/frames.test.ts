import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { SCENES } from "@/content/lessons";
import { stageFrame } from "@/features/stage/frame";
import { beatFrames } from "./frames";

describe("beat frames", () => {
  const scene = SCENES["b1-1"];
  if (!scene) throw new Error("B1.1 has no scene");
  const frames = beatFrames(scene);

  it("are plain JSON", () => {
    expect(JSON.parse(JSON.stringify(frames))).toEqual(frames);
  });

  it("equal the frames a live session builds for B1.1", () => {
    const session = new Session(createWorld(scene.world));
    const live = scene.beats.map((beat) => {
      for (const line of beat.run ?? []) session.run(line);
      const { world, history } = session.getSnapshot();
      const ran = history.slice(history.length - (beat.run?.length ?? 0));
      return stageFrame(
        world,
        ran.flatMap((e) => e.outcome.effects),
      );
    });
    expect(frames.map((f) => f.stage)).toEqual(live);
  });

  it("start from the untouched folder and end on the root commit", () => {
    expect(frames[0]?.stage.view).toBeNull();
    expect(frames[0]?.transcript).toEqual([]);
    const last = frames.at(-1);
    expect(last?.stage.view?.commits).toHaveLength(1);
    expect(last?.transcript.map((t) => t.command)).toEqual([
      "git add .",
      "git commit -m 'First snapshot of the recipe site'",
    ]);
  });
});

describe("B5.3 frames", () => {
  it("show what forcing the rejected push would remove, and only there", () => {
    const scene = SCENES["b5-3"];
    if (!scene) throw new Error("B5.3 has no scene");
    const lost = beatFrames(scene).map((f) => [f.id, f.stage.lost]);
    expect(lost.filter(([, l]) => l)).toEqual([
      [
        "rejected",
        expect.objectContaining({
          remote: "origin",
          branch: "main",
          lost: [expect.objectContaining({ subject: "Add the team meeting" })],
        }),
      ],
    ]);
    expect(JSON.parse(JSON.stringify(lost))).toEqual(lost);
  });
});
