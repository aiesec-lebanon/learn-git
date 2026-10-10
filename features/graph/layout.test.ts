import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { fakeView } from "./fake-history";
import { assignLanes, layoutGraph } from "./layout";
import { repoView } from "./view-model";

const OPTIONS = { column: 40, lane: 30, glyph: 8, pad: 10 };
const lanesOf = (parents: number[][]) => [
  ...assignLanes(fakeView(parents).commits).values(),
];

describe("assignLanes", () => {
  it("keeps first-parent chains in their lane and reuses freed lanes", () => {
    expect(lanesOf([[], [0], [1]])).toEqual([0, 0, 0]);
    // A, B(A), C(A), M(B, C), D(C), E()
    expect(lanesOf([[], [0], [0], [1, 2], [2], []])).toEqual([
      0, 0, 1, 0, 1, 2,
    ]);
    expect(lanesOf([[], [0], [0], [2], [1, 3], [0]])).toEqual([
      0, 0, 1, 1, 0, 1,
    ]);
  });

  it("never moves a commit when later commits arrive", () => {
    const dag = fc
      .array(fc.tuple(fc.nat(), fc.nat(), fc.boolean()), { maxLength: 60 })
      .map((picks) =>
        picks.map(([a, b, merge], i) =>
          i === 0 ? [] : merge && a % i !== b % i ? [a % i, b % i] : [a % i],
        ),
      );
    fc.assert(
      fc.property(dag, fc.nat(), (parents, cut) => {
        const k = parents.length ? cut % parents.length : 0;
        const full = layoutGraph(fakeView(parents), OPTIONS).nodes;
        const prefix = layoutGraph(
          fakeView(parents.slice(0, k)),
          OPTIONS,
        ).nodes;
        for (const [oid, node] of prefix) expect(full.get(oid)).toEqual(node);
      }),
    );
  });
});

describe("layoutGraph", () => {
  it("places columns by arrival and edges from parent to child", () => {
    const layout = layoutGraph(fakeView([[], [0], [0], [1, 2]]), OPTIONS);
    const nodes = [...layout.nodes.values()];
    expect(nodes.map((n) => [n.x, n.y])).toEqual([
      [10, 10],
      [50, 10],
      [90, 40],
      [130, 10],
    ]);
    expect(
      layout.edges.map((e) => [e.child.slice(-1), e.parent.slice(-1), e.merge]),
    ).toEqual([
      ["1", "0", false],
      ["2", "0", false],
      ["3", "1", false],
      ["3", "2", true],
    ]);
    expect(layout).toMatchObject({
      lanes: 2,
      width: 130 + 4 * 8 + 10,
      height: 50,
    });
    expect(layoutGraph(fakeView([]), OPTIONS)).toMatchObject({
      lanes: 1,
      width: 10,
      height: 20,
    });
  });
});

describe("repoView", () => {
  it("lists commits in arrival order with labels, HEAD and ghosts", () => {
    const session = new Session(
      createWorld({ files: { "p/a": "a\n" }, cwd: "p" }),
    );
    session.run("git init && git add . && git commit -m 'First page'");
    session.run("echo b >> a && git add . && git commit -m Second");
    const world = session.getSnapshot().world;
    const repo = [...world.repos.values()][0];
    if (!repo) throw new Error("no repo");
    const view = repoView(world, repo);
    expect(
      view.commits.map((c) => [
        c.subject,
        c.parents.length,
        c.ghost,
        c.short.length,
      ]),
    ).toEqual([
      ["First page", 0, 0, 7],
      ["Second", 1, 0, 7],
    ]);
    const [first, second] = view.commits;
    expect(view.labels).toEqual([
      { name: "main", kind: "branch", target: second?.oid },
    ]);
    expect(view.head).toEqual({
      kind: "branch",
      branch: "main",
      target: second?.oid,
    });

    const moved = {
      ...repo,
      refs: new Map([[[...repo.refs.keys()][0] as never, first?.oid as never]]),
    };
    expect(repoView(world, moved).commits.map((c) => c.ghost)).toEqual([0, 1]);
    const forgotten = { ...moved, reflogs: new Map() };
    expect(repoView(world, forgotten).commits.map((c) => c.ghost)).toEqual([
      0, 2,
    ]);
    const detached = {
      ...repo,
      head: { kind: "detached" as const, oid: first?.oid as never },
    };
    expect(repoView(world, detached).head).toEqual({
      kind: "detached",
      target: first?.oid,
    });
  });
});
