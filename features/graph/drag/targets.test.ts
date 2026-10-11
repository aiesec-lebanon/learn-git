import { describe, expect, it } from "vitest";
import { createWorld, runLine, type World } from "@/engine";
import { repoView } from "../view-model";
import {
  branchTarget,
  commitTarget,
  dropOutcome,
  dropTargets,
  targetName,
} from "./targets";

const viewOf = (world: World) => {
  const repo = [...world.repos.values()][0];
  if (!repo) throw new Error("no repo");
  return repoView(world, repo);
};

const twoCommits = () =>
  viewOf(
    createWorld({
      files: { "p/a.txt": "a\n" },
      cwd: "p",
      setup: [
        "git init -q",
        "git add .",
        'git commit -q -m "One"',
        "echo b >> a.txt",
        'git commit -q -am "Two"',
        "git branch dark-mode",
      ],
    }),
  );

describe("drop targets", () => {
  it("lists commits newest first, then branch labels", () => {
    const view = twoCommits();
    const [two, one] = [...view.commits].reverse();
    expect(dropTargets(view)).toEqual([
      commitTarget(two?.oid ?? ""),
      commitTarget(one?.oid ?? ""),
      ...view.labels.map((l) => branchTarget(l.name)),
    ]);
  });

  it("turns HEAD drops into git switch", () => {
    const view = twoCommits();
    const one = view.commits[0];
    if (!one) throw new Error("no commit");
    const head = { kind: "head" } as const;
    expect(dropOutcome(view, head, branchTarget("dark-mode"))).toEqual({
      ok: true,
      command: "git switch dark-mode",
    });
    expect(dropOutcome(view, head, branchTarget("main"))).toEqual({
      ok: false,
      reason: "HEAD is already on main.",
    });
    expect(dropOutcome(view, head, commitTarget(one.oid))).toEqual({
      ok: true,
      command: `git switch --detach ${one.short}`,
    });
    expect(dropOutcome(view, head, null).ok).toBe(false);
  });

  it("refuses HEAD on the commit it is already detached at", () => {
    const world = runLine(
      createWorld({
        files: { "p/a.txt": "a\n" },
        cwd: "p",
        setup: ["git init -q", "git add .", 'git commit -q -m "One"'],
      }),
      "git switch -q --detach",
    ).world;
    const view = viewOf(world);
    const target = commitTarget(view.commits[0]?.oid ?? "");
    expect(dropOutcome(view, { kind: "head" }, target)).toEqual({
      ok: false,
      reason: "HEAD already points at that commit.",
    });
  });

  it("turns a named label on a commit into git branch, and explains bad drops", () => {
    const view = twoCommits();
    const one = view.commits[0];
    if (!one) throw new Error("no commit");
    const at = commitTarget(one.oid);
    const label = (name: string) => ({ kind: "label", name }) as const;
    expect(dropOutcome(view, label(" fix "), at)).toEqual({
      ok: true,
      command: `git branch fix ${one.short}`,
    });
    expect(dropOutcome(view, label(""), at)).toMatchObject({ ok: false });
    expect(dropOutcome(view, label("a b"), at)).toMatchObject({ ok: false });
    expect(dropOutcome(view, label("main"), at)).toMatchObject({
      ok: false,
      reason: expect.stringContaining("exactly one commit"),
    });
    expect(dropOutcome(view, label("x"), branchTarget("main"))).toMatchObject({
      ok: false,
    });
    expect(targetName(view, at)).toBe(`commit ${one.short}, One`);
    expect(targetName(view, branchTarget("main"))).toBe("the main label");
  });
});
