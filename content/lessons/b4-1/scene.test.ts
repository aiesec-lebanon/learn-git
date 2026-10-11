import { describe, expect, it } from "vitest";
import {
  createWorld,
  match,
  resolveHead,
  Session,
  type Commit,
} from "@/engine";
import scene from "./scene";

describe("B4.1", () => {
  it("fast-forwards first, then records a two-parent commit with --no-ff", () => {
    const session = new Session(createWorld(scene.world));
    const [, , glide, noFF] = scene.beats;
    const out = (glide?.run ?? []).flatMap((line) =>
      session.run(line).map((e) => e.outcome.output.stdout),
    );
    expect(out.join("")).toContain("Fast-forward");
    for (const line of noFF?.run ?? []) session.run(line);
    const { world } = session.getSnapshot();
    const repo = [...world.repos.values()][0];
    const tip = repo ? resolveHead(repo) : null;
    const commit = tip ? (world.objects.get(tip) as Commit) : null;
    expect(commit?.parents).toHaveLength(2);
  });

  it("is not solved by merging without deleting the branch", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run("git merge dark-mode");
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
