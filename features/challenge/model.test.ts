import { describe, expect, it } from "vitest";
import { countPar, createWorld, Session } from "@/engine";
import type { Challenge } from "@/content/define";
import b1_2 from "@/content/lessons/b1-2/scene";
import b3_1 from "@/content/lessons/b3-1/scene";
import b6_2 from "@/content/lessons/b6-2/scene";
import { parPath, pathSteps, solvedLine, underParWhy } from "./model";

const need = (challenge: Challenge | undefined): Challenge => {
  if (!challenge) throw new Error("no challenge");
  return challenge;
};

const play = (challenge: Challenge, lines: readonly string[]) => {
  const session = new Session(createWorld(challenge.world));
  for (const line of lines) session.run(line);
  return session.getSnapshot().history;
};

describe("challenge model", () => {
  it("words the solved line quietly", () => {
    expect(solvedLine(5, 4)).toBe("Solved in 5 · par 4");
  });

  it("replays the par path as counted steps, free edits folded in", () => {
    const steps = parPath(need(b3_1.challenge));
    expect(steps.map((s) => s.text)).toEqual([
      "git switch -c feature 'HEAD~1'",
      "git commit -am 'Note the servings'",
      "git switch main",
    ]);
    expect(steps.every((s) => s.frame.view !== null)).toBe(true);
  });

  it("keeps teammates' reactions out of the steps", () => {
    const challenge = need(b6_2.challenge);
    const steps = parPath(challenge);
    expect(steps).toHaveLength(challenge.par);
  });

  it("leaves out refused and reading commands", () => {
    const challenge = need(b1_2.challenge);
    const history = play(challenge, [
      "git status",
      "git push",
      ...(challenge.solution as string[]),
    ]);
    expect(pathSteps(history).map((s) => s.text)).toEqual([
      "git add README.md",
      "git commit -m 'Fix typo'",
    ]);
    expect(countPar(history)).toBe(2);
  });

  it("explains only paths under par, with the recorded reason when the shape matches", () => {
    const challenge = need(b1_2.challenge);
    const short = play(challenge, ['git commit -m "Fix typo" README.md']);
    expect(
      underParWhy(play(challenge, challenge.solution as string[]), challenge),
    ).toBeNull();
    expect(underParWhy(short, challenge)).toMatch(/shorter than the reference/);
    const recorded: Challenge = {
      ...challenge,
      underPar: [
        {
          solution: ['git commit -m "x" README.md'],
          why: "A pathspec commits just that file.",
        },
      ],
    };
    expect(underParWhy(short, recorded)).toBe(
      "A pathspec commits just that file.",
    );
  });
});
