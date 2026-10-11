import { describe, expect, it } from "vitest";
import { createWorld, runLine, type World } from "@/engine";
import {
  chosenText,
  hunksOf,
  markerLines,
  parseConflicts,
  pausedMerge,
  replaceHunk,
} from "./model";

const start = createWorld({
  files: {
    "shop/pricing.html": "<h1>Prices</h1>\n<p>Cake: 4</p>\n<p>Tea: 2</p>\n",
  },
  cwd: "shop",
  setup: [
    "git init -q",
    "git add .",
    'git commit -q -m "Base"',
    "git switch -q -c pricing",
    `echo -ne '<h1>Prices</h1>\\n<p>Cake: 5</p>\\n<p>Tea: 2</p>\\n' > pricing.html`,
    'git commit -q -am "Raise the cake price"',
    "git switch -q main",
    `echo -ne '<h1>Prices</h1>\\n<p>Cake: 6</p>\\n<p>Tea: 2</p>\\n' > pricing.html`,
    'git commit -q -am "Cake costs 6"',
  ],
});

const conflicted = (style?: string): World => {
  const config = style ? `git config merge.conflictStyle ${style} && ` : "";
  return runLine(start, `${config}git merge pricing`).world;
};

const fileOf = (world: World) =>
  pausedMerge(world)?.files.find((f) => f.path === "pricing.html")?.text ?? "";

describe("conflict model", () => {
  it.each(["merge", "diff3", "zdiff3"])(
    "parses and re-renders the %s style",
    (style) => {
      const text = fileOf(conflicted(style));
      const segments = parseConflicts(text);
      const [hunk] = hunksOf(segments);
      expect(hunk?.ours).toBe("<p>Cake: 6</p>\n");
      expect(hunk?.theirs).toBe("<p>Cake: 5</p>\n");
      expect(hunk?.labels).toMatchObject({ ours: "HEAD", theirs: "pricing" });
      expect(hunk?.base).toBe(style === "merge" ? null : "<p>Cake: 4</p>\n");
      expect(replaceHunk(segments, -1, "")).toBe(text);
    },
  );

  it("replaces one hunk with ours, theirs or both", () => {
    const segments = parseConflicts(fileOf(conflicted()));
    const [hunk] = hunksOf(segments);
    if (!hunk) throw new Error("no hunk");
    const both = replaceHunk(segments, 0, chosenText(hunk, "both"));
    expect(both).toBe(
      "<h1>Prices</h1>\n<p>Cake: 6</p>\n<p>Cake: 5</p>\n<p>Tea: 2</p>\n",
    );
    expect(markerLines(both)).toEqual([]);
    expect(chosenText(hunk, "theirs")).toBe("<p>Cake: 5</p>\n");
  });

  it("flags leftover markers and keeps a broken hunk as text", () => {
    const broken = "a\n<<<<<<< HEAD\nb\n=======\nc\n";
    expect(hunksOf(parseConflicts(broken))).toEqual([]);
    expect(replaceHunk(parseConflicts(broken), 0, "")).toBe(broken);
    expect(markerLines(broken)).toEqual([2, 4]);
    expect(markerLines("<<<<<<<< eight\n==\n")).toEqual([]);
  });

  it("lists unmerged files until git add, and nothing outside a merge", () => {
    const paused = pausedMerge(conflicted());
    expect(paused?.message).toBe("Merge branch 'pricing'");
    expect(paused?.files.map((f) => [f.path, f.arg])).toEqual([
      ["pricing.html", "pricing.html"],
    ]);
    const added = runLine(conflicted(), "git add pricing.html").world;
    expect(pausedMerge(added)?.files).toEqual([]);
    expect(pausedMerge(start)).toBeNull();
  });

  it("names a stopped rebase by the pick it replays", () => {
    const world = runLine(start, "git switch -q pricing; git rebase main").world;
    const paused = pausedMerge(world);
    expect(paused?.kind).toBe("rebase");
    expect(paused?.message).toMatch(/^\w{7} Raise the cake price$/);
    expect(fileOf(world)).toMatch(/>>>>>>> \w{7} \(Raise the cake price\)\n/);
  });
});
