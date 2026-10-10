import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createWorld, Session, type Oid } from "@/engine";
import { commitName } from "./describe";
import { fakeView } from "./fake-history";
import { CommitGraph } from "./graph";
import { layoutGraph } from "./layout";
import { nextFocus } from "./keyboard";
import { repoView, type RepoView } from "./view-model";

const OPTIONS = { column: 40, lane: 30, glyph: 8, pad: 10 };

function sampleView(): RepoView {
  const session = new Session(
    createWorld({ files: { "p/a": "a\n" }, cwd: "p" }),
  );
  session.run("git init && git add . && git commit -m 'Add <b>page</b>'");
  session.run("echo b >> a && git add . && git commit -m 'Add footer'");
  const world = session.getSnapshot().world;
  const repo = [...world.repos.values()][0];
  if (!repo) throw new Error("no repo");
  return repoView(world, repo);
}

describe("commit names", () => {
  it("names commit, message, parents, labels and HEAD", () => {
    const view = sampleView();
    const [first, second] = view.commits;
    if (!first || !second) throw new Error("commits");
    expect(commitName(second, view)).toBe(
      `${second.short}, Add footer, parent ${first.short}, main, HEAD`,
    );
    expect(commitName(first, view)).toBe(
      `${first.short}, Add <b>page</b>, first commit`,
    );
    const merge = fakeView([[], [0], [0], [1, 2]]);
    const detached: RepoView = {
      ...merge,
      labels: [
        { name: "v1", kind: "tag", target: merge.commits[3]?.oid as Oid },
      ],
      head: { kind: "detached", target: merge.commits[3]?.oid as Oid },
      commits: merge.commits.map((c, i) => (i === 2 ? { ...c, ghost: 2 } : c)),
    };
    expect(commitName(detached.commits[3] as never, detached)).toBe(
      "0000003, c3, parents 0000001 and 0000002, tag v1, detached HEAD",
    );
    expect(commitName(detached.commits[2] as never, detached)).toMatch(
      /unreachable$/,
    );
  });
});

describe("nextFocus", () => {
  const view = fakeView([[], [0], [0], [1, 2]]);
  const layout = layoutGraph(view, OPTIONS);
  const id = (i: number) => view.commits[i]?.oid as Oid;
  it.each([
    ["ArrowLeft", 3, 1],
    ["ArrowLeft", 0, null],
    ["ArrowRight", 0, 1],
    ["ArrowRight", 2, 3],
    ["ArrowRight", 3, null],
    ["ArrowDown", 1, 2],
    ["ArrowUp", 2, 1],
    ["ArrowUp", 0, null],
    ["Home", 3, 0],
    ["End", 0, 3],
    ["Enter", 0, null],
  ] as const)("%s from %i goes to %s", (key, from, to) => {
    expect(nextFocus(key, id(from), view, layout)).toBe(
      to === null ? null : id(to),
    );
  });
});

describe("CommitGraph", () => {
  it("renders an ordered list of named commit buttons with one roving stop", () => {
    const view = sampleView();
    const html = renderToStaticMarkup(
      createElement(CommitGraph, {
        view,
        label: "Your repository",
        describe: () => "x",
      }),
    );
    expect(html).toContain(
      'aria-label="Your repository: commits, oldest first"',
    );
    expect(html.match(/<li /g)).toHaveLength(2);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain("<bdi>Add &lt;b&gt;page&lt;/b&gt;</bdi>");
    expect(html).not.toContain("<b>page");
    expect(html).toContain('<svg aria-hidden="true"');
    expect(html).toContain("Describe this graph");
    expect(
      renderToStaticMarkup(
        createElement(CommitGraph, { view: fakeView([]), label: "Empty" }),
      ),
    ).toContain("No commits yet.");
  });
});
