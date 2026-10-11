import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import scene from "./scene";

const solved = (lines: readonly string[]) => {
  const session = new Session(createWorld(scene.yourTurn.world));
  for (const line of lines) session.run(line);
  return match(session.getSnapshot().world, scene.yourTurn.target).ok;
};

describe("B3.1", () => {
  it("is not solved by committing on main", () => {
    expect(
      solved([
        "git branch dark-mode",
        'echo "body {}" > dark.css',
        "git add dark.css",
        'git commit -m "Dark"',
      ]),
    ).toBe(false);
  });

  it("is not solved while HEAD stays on dark-mode", () => {
    expect(
      solved([
        "git switch -c dark-mode",
        'echo "body {}" > dark.css',
        "git add dark.css",
        'git commit -m "Dark"',
      ]),
    ).toBe(false);
  });
});
