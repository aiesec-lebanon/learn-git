import { describe, expect, it } from "vitest";
import { createWorld, previewMerge, runLine, type Repo } from "@/engine";
import { writeFile } from "@/content/define";
import {
  FOOTER,
  recipeSiteFiles,
  recipeSiteForked,
} from "@/content/worlds/recipe-site";
import { repoView } from "@/features/graph/view-model";
import { fileNote, mergedText, parentLines } from "./three-way-view.model";

const world = createWorld(recipeSiteForked);
const repoOf = (w: typeof world) => [...w.repos.values()][0] as Repo;

describe("three-way view", () => {
  it("says where each file of the result comes from", () => {
    const preview = previewMerge(world.objects, repoOf(world), "footer");
    if (preview.kind !== "merge") throw new Error(preview.kind);
    const rows = preview.files.map((f) => [f.path, fileNote(f)]);
    expect(rows).toEqual([
      ["README.md", "Changed only on ours: the result keeps ours."],
      ["index.html", "Changed only on theirs: the result takes theirs."],
    ]);
    expect(mergedText(preview.files[1]!)).toContain(FOOTER);
  });

  it("combines changes to different lines of one file", () => {
    const retitled = recipeSiteFiles["recipe-site/index.html"].replace(
      "<title>Recipes",
      "<title>Our recipes",
    );
    const both = runLine(
      world,
      `${writeFile("index.html", retitled)} && git commit -q -am Title`,
    ).world;
    const preview = previewMerge(both.objects, repoOf(both), "footer");
    if (preview.kind !== "merge") throw new Error(preview.kind);
    const index = preview.files[1]!;
    expect(index.from).toBe("both");
    expect(fileNote(index)).toMatch(/different places/);
    expect(mergedText(index)).toBe(`${retitled}${FOOTER}\n`);
  });

  it("lists a merge commit's parents in order", () => {
    const merged = runLine(world, "git merge -q footer").world;
    const view = repoView(merged, repoOf(merged));
    const head = view.commits.find((c) => c.oid === view.head.target)!;
    const lines = parentLines(view, head);
    expect(lines[0]).toMatch(/is a merge commit with 2 parents\.$/);
    expect(lines[1]).toMatch(
      /^First parent \(\w+\^1\): \w+ "Announce desserts"/,
    );
    expect(lines[2]).toMatch(/^Parent 2 \(\w+\^2\): \w+ "Add a footer"/);
    const root = view.commits[0]!;
    expect(parentLines(view, root)).toEqual([
      `${root.short} is the first commit: it has no parent.`,
    ]);
  });
});
