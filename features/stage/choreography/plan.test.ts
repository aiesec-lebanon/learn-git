import { describe, expect, it } from "vitest";
import { createWorld, Session, type World } from "@/engine";
import { layoutGraph } from "@/features/graph/layout";
import { repoView } from "@/features/graph/view-model";
import { annotate } from "./annotations";
import { planChoreography, type GraphFrame } from "./plan";

const MOTION = {
  quick: 200,
  draw: 500,
  stagger: 50,
  easing: { standard: "s", draw: "d", stick: "k" },
} as const;
const OPTIONS = { column: 100, lane: 80, glyph: 8, pad: 20 };
const ROOT = "/home/you/p";

function frameOf(world: World): GraphFrame | null {
  const repo = [...world.repos.values()][0];
  if (!repo) return null;
  const view = repoView(world, repo);
  return { layout: layoutGraph(view, OPTIONS), head: view.head.target };
}

function step(session: Session, line: string) {
  const before = frameOf(session.getSnapshot().world);
  const effects = session.run(line).flatMap((e) => e.outcome.effects);
  const world = session.getSnapshot().world;
  return {
    effects,
    world,
    steps: planChoreography(
      { effects, before, after: frameOf(world), root: ROOT },
      MOTION,
    ),
  };
}

const short = (s: { key: string }) => s.key.replace(/[0-9a-f]{40}/g, "#");

describe("planChoreography", () => {
  it("orders files, staging, the commit, its arrow, then labels", () => {
    const session = new Session(
      createWorld({ files: { "p/a": "a\n" }, cwd: "p" }),
    );
    expect(step(session, "git init").steps).toEqual([]);
    const add = step(session, "echo b > b; git add .").steps;
    expect(add.map((s) => [short(s), s.kind, s.delay, s.duration])).toEqual([
      ["file:worktree:b", "enter", 0, 200],
      ["file:index:a", "copy", 200, 500],
      ["file:index:b", "copy", 250, 500],
    ]);
    const first = step(session, "git commit -m one").steps;
    expect(first.map((s) => [short(s), s.kind, s.delay])).toEqual([
      ["commit:#", "enter", 0],
      ["label:refs/heads/main", "enter", 500],
      ["label:HEAD", "enter", 550],
    ]);
    const second = step(
      session,
      "echo c >> a; git add a && git commit -m two",
    ).steps;
    expect(second.map((s) => [short(s), s.kind, s.delay, s.easing])).toEqual([
      ["file:worktree:a", "pulse", 0, "s"],
      ["file:index:a", "copy", 200, "s"],
      ["commit:#", "enter", 700, "d"],
      ["edge:#:#", "enter", 1200, "d"],
      ["label:refs/heads/main", "move", 1700, "k"],
      ["label:HEAD", "move", 1750, "k"],
    ]);
    expect(second.at(-1)?.offset).toEqual({ x: -100, y: 0 });
  });

  it("annotates the same changes as before → after chips", () => {
    const session = new Session(
      createWorld({ files: { "p/a": "a\n" }, cwd: "p" }),
    );
    session.run("git init; git add a");
    const { effects, world } = step(
      session,
      "git commit -m one; rm a; git add a",
    );
    expect(
      annotate(effects, world, ROOT).map((n) => n.replace(/[0-9a-f]{7}/g, "#")),
    ).toEqual([
      "new commit #",
      "main: none → #",
      "a: deleted",
      "a: out of the staging area",
    ]);
    const add = step(session, "echo b > a; git add a");
    expect(annotate(add.effects, add.world, ROOT)).toEqual([
      "a: created",
      "a: copied into the staging area",
    ]);
    expect(add.steps.find((s) => s.kind === "copy")?.from).toBe(
      "file:worktree:a",
    );
  });
});
