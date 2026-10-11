import { describe, expect, it } from "vitest";
import { createWorld, runLine, type World } from "@/engine";
import { motionTokens } from "@/features/motion/policy";
import { graphLayout } from "@/features/graph/graph";
import { stageFrame } from "../frame";
import { repoPanels } from "./model";
import { planTransfers } from "./transfer";

const URL = "https://hub.test/sam/team.git";
const team = (): World =>
  createWorld({
    machines: {
      sam: {
        global: {
          "user.name": "Sam",
          "user.email": "sam@team.test",
          "init.defaultBranch": "main",
        },
      },
    },
    hub: { "sam/team": {} },
    setup: [
      {
        machine: "sam",
        run: `git clone -q ${URL} && cd team && echo a > a.txt && git add . && git commit -q -m One && git push -q`,
      },
      `git clone -q ${URL}`,
      "cd team",
    ],
  });

const sam = (world: World, line: string) =>
  runLine(world, `cd /home/sam/team; ${line}`, "sam").world;

describe("the multi-repository stage", () => {
  it("shows origin (named as your clone calls it) and Sam's clone", () => {
    const world = team();
    const main = stageFrame(world, []).view?.id ?? null;
    const panels = repoPanels(world, main);
    expect(panels.map((p) => [p.role, p.title, p.where])).toEqual([
      ["remote", "origin", "hub.test/sam/team"],
      ["teammate", "Sam's clone", "~sam/team"],
    ]);
    const origin = panels[0]?.view;
    expect(origin?.labels.map((l) => [l.name, l.kind])).toEqual([
      ["main", "branch"],
    ]);
    expect(origin?.head.target).toBeNull();
  });

  it("stamps origin/* with the last contact and counts ahead and behind", () => {
    const pushed = sam(
      team(),
      "echo b >> a.txt && git commit -q -am Two && git push -q",
    );
    const mine = runLine(
      pushed,
      "echo m > m.txt && git add m.txt && git commit -q -m Mine",
    ).world;
    const view = stageFrame(mine, []).view;
    const remote = view?.labels.find((l) => l.name === "origin/main");
    expect(remote?.note).toMatch(/^last contact \d\d:\d\d$/);
    const local = view?.labels.find((l) => l.name === "main");
    expect(local?.note).toBe("ahead 1");
    const fetched = runLine(mine, "git fetch -q").world;
    const after = stageFrame(fetched, []).view;
    expect(after?.labels.find((l) => l.name === "main")?.note).toBe(
      "ahead 1 · behind 1",
    );
  });

  it("flies fetched commits from origin's panel into yours", () => {
    const before = sam(
      team(),
      "echo b >> a.txt && git commit -q -am Two && git push -q",
    );
    const ran = runLine(before, "git fetch -q");
    const effects = ran.outcomes.flatMap((o) => o.effects);
    const frame = stageFrame(ran.world, effects);
    const origin = frame.panels[0];
    const main = frame.view;
    if (!origin || !main) throw new Error("no panels");
    const graphs = new Map([
      [
        origin.id,
        { scope: origin.scope, before: null, after: graphLayout(origin.view) },
      ],
      [main.id, { scope: "", before: null, after: graphLayout(main) }],
    ]);
    const steps = planTransfers(effects, graphs, main.id, 0, motionTokens);
    expect(steps[0]).toMatchObject({
      kind: "copy",
      from: expect.stringMatching(/^hub:\/sam\/team\.git\|commit:/),
    });
  });
});
