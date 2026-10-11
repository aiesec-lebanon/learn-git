import { describe, expect, it } from "vitest";
import {
  createWorld,
  previewMerge,
  runLine,
  type Oid,
  type Repo,
} from "@/engine";
import { recipeSiteDarkMode } from "@/content/worlds/recipe-site";
import { repoView } from "@/features/graph/view-model";
import {
  broughtIn,
  comparisonText,
  landing,
  mergeMessage,
  outcomeText,
} from "./merge-preview.model";

const onMain = runLine(
  createWorld(recipeSiteDarkMode),
  "git switch -q main",
).world;
const repo = [...onMain.repos.values()][0] as Repo;
const view = repoView(onMain, repo);
const short = (oid: string) =>
  view.commits.find((c) => c.oid === oid)?.short ?? oid;
const names = { branch: "main", name: "dark-mode", short };
const tip = view.labels.find((l) => l.name === "dark-mode")?.target as Oid;
const head = view.head.target as Oid;

describe("merge preview text", () => {
  it("explains a fast-forward and the forced merge commit", () => {
    const ff = previewMerge(onMain.objects, repo, "dark-mode");
    expect(landing(ff)).toEqual({ kind: "commit", oid: tip });
    expect(outcomeText(ff, names)).toBe(
      `Fast-forward: main has nothing new of its own, so its label slides from ${short(head)} to ${short(tip)}. No new commit.`,
    );
    const forced = previewMerge(onMain.objects, repo, "dark-mode", true);
    expect(landing(forced)).toEqual({ kind: "new" });
    expect(outcomeText(forced, names, true)).toContain(
      `"Merge branch 'dark-mode'"`,
    );
    expect([...broughtIn(onMain, view, "dark-mode")]).toEqual([tip]);
  });

  it("compares a guess with the outcome without grading it", () => {
    const ff = previewMerge(onMain.objects, repo, "dark-mode");
    expect(comparisonText({ kind: "commit", oid: tip }, ff, names)).toMatch(
      /^You expected main on \S+, and so does Git\. main lands on/,
    );
    const missed = comparisonText({ kind: "new" }, ff, names);
    expect(missed).toMatch(/^You expected main on a new commit\. main lands/);
    expect(missed).not.toMatch(/wrong|correct|right/i);
    expect(comparisonText(null, ff, names)).toMatch(/^main lands on/);
  });

  it("names the conflicted files and the up-to-date case", () => {
    const up = previewMerge(onMain.objects, repo, "main");
    expect(outcomeText(up, { ...names, name: "main" })).toMatch(
      /^Already up to date/,
    );
    expect(mergeMessage("dark-mode", "main")).toBe(
      "Merge branch 'main' into dark-mode",
    );
    const clash = runLine(
      onMain,
      'echo "body { color: red; }" > dark.css && git add dark.css && git commit -q -m Red',
    ).world;
    const preview = previewMerge(
      clash.objects,
      [...clash.repos.values()][0] as Repo,
      "dark-mode",
    );
    expect(landing(preview)).toEqual({ kind: "paused" });
    expect(outcomeText(preview, names)).toMatch(
      /^Conflict: both sides changed dark\.css since/,
    );
  });
});
