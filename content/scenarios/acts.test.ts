import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { defineScenario } from "../define";
import { actsReached, seedLines } from "./acts";

const scene = defineScenario({
  id: "s-b2",
  brief: { from: "Sam", message: "Save the notes." },
  goal: "Commit notes.txt on a branch.",
  world: { files: { "p/notes.txt": "hi\n" }, cwd: "p", setup: ["git init -q"] },
  acts: [
    {
      id: "branch",
      title: "On a branch",
      goal: "Make a branch.",
      targets: [{ head: { branch: "notes" } }],
    },
    {
      id: "commit",
      title: "Committed",
      goal: "Commit the file.",
      targets: [
        { branches: { notes: "c" }, commits: { c: { parents: [] } } },
        { branches: { other: "c" }, commits: { c: { parents: [] } } },
      ],
    },
  ],
  experts: [
    {
      title: "Branch first",
      solution: ["git switch -c notes", "git add .", 'git commit -m "Notes"'],
      tradeoffs: "Plain.",
    },
  ],
});

describe("scenario acts", () => {
  it("counts acts in order, later acts counting the earlier ones", () => {
    const session = new Session(createWorld(scene.world));
    const counts = [actsReached(scene, session.getSnapshot().world)];
    for (const line of scene.experts[0].solution) {
      session.run(line);
      counts.push(actsReached(scene, session.getSnapshot().world));
    }
    expect(counts).toEqual([0, 1, 1, 2]);
    const other = new Session(createWorld(scene.world));
    for (const line of ["git switch -c other", "git add .", "git commit -m x"])
      other.run(line);
    expect(actsReached(scene, other.getSnapshot().world)).toBe(2);
  });

  it("re-seeds by replaying the first expert path up to an act", () => {
    expect(seedLines(scene, 0)).toEqual([]);
    expect(seedLines(scene, 1)).toEqual(["git switch -c notes"]);
    expect(seedLines(scene, 2)).toEqual(scene.experts[0].solution);
  });
});
