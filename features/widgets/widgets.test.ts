import { describe, expect, it } from "vitest";
import { identityCommands } from "./identity-form.model";
import { WIDGET_NAMES } from "./names";
import { snapshotAt, snapshotText } from "./snapshot-scrubber.model";
import { carryable, dropCommand, STAGING } from "./stage-files.model";
import { lensSections } from "./status-lens.model";
import {
  historySnapshots,
  ripple,
  snapshotLabel,
} from "./recipe-history.model";
import { createWorld, Session } from "@/engine";
import { stageFiles } from "@/features/stage/files";
import { typoAndFeature } from "@/content/worlds/typo-and-feature";
import { recipeSite } from "@/content/worlds/recipe-site";

const MDX = import.meta.glob<string>("../../content/lessons/*/lesson.mdx", {
  query: "?raw",
  import: "default",
  eager: true,
});

describe("widgets", () => {
  it("exist for every name the lessons use", () => {
    for (const mdx of Object.values(MDX))
      for (const [, name] of mdx.matchAll(/<Widget\s+name="([^"]+)"/g))
        expect(WIDGET_NAMES).toContain(name);
  });

  it("compose quoted config commands, name first", () => {
    expect(identityCommands(" Ana María ", "ana@example.com")).toEqual([
      "git config set --global user.name 'Ana María'",
      "git config set --global user.email ana@example.com",
    ]);
    expect(identityCommands("O'Neil", "")).toEqual([
      "git config set --global user.name 'O'\\''Neil'",
    ]);
    expect(identityCommands(" ", " ")).toEqual([]);
  });

  it("mark what each snapshot added or changed", () => {
    expect(snapshotAt(0).files).toEqual([
      { path: "index.html", change: "added" },
    ]);
    expect(snapshotAt(3).files).toEqual([
      { path: "README.md", change: null },
      { path: "index.html", change: "changed" },
      { path: "soup.html", change: null },
    ]);
    expect(snapshotAt(9)).toEqual(snapshotAt(3));
    expect(snapshotText(1)).toBe("Snapshot 2 of 4: Add a README");
  });

  it("carry changed files and stage them with git add", () => {
    const world = createWorld(typoAndFeature);
    expect(carryable(stageFiles(world)).map((f) => f.path)).toEqual([
      "README.md",
      "app.js",
      "notes.txt",
    ]);
    expect(carryable(stageFiles(createWorld(recipeSite)))).toEqual([]);
    expect(dropCommand("my notes.txt", STAGING)).toBe("git add 'my notes.txt'");
    expect(dropCommand("a", null)).toBeNull();
  });

  it("map each status section to the zones it compares", () => {
    const session = new Session(createWorld(typoAndFeature));
    session.run("git add README.md");
    const sections = lensSections(session.getSnapshot().world);
    expect(sections?.map((s) => [s.heading, s.zones, s.files])).toEqual([
      ["Changes to be committed", ["index", "head"], ["modified: README.md"]],
      [
        "Changes not staged for commit",
        ["worktree", "index"],
        ["modified: app.js"],
      ],
      ["Untracked files", ["worktree"], ["notes.txt"]],
    ]);
    expect(lensSections(createWorld(recipeSite))).toBeNull();
  });

  it("show the recipe history and ripple a new first message", () => {
    expect(historySnapshots().map((s) => s.subject)).toEqual([
      "First snapshot",
      "Add the soup recipe",
      "Mention the soup in the README",
    ]);
    expect(snapshotLabel(1)).toMatch(
      /^Commit 2 of 3: [0-9a-f]{7} Add the soup/,
    );
    expect(ripple("First snapshot").every((r) => r.old === r.new)).toBe(true);
    const rows = ripple("Start the site");
    expect(rows.map((r) => r.old !== r.new)).toEqual([true, true, true]);
    expect(rows[0]?.subject).toBe("Start the site");
  });
});
