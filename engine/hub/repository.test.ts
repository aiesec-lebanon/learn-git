import { describe, expect, it } from "vitest";
import { execute } from "../execute";
import { narrate } from "../narration/narrate";
import { branchRef } from "../refs/names";
import { runLine } from "../run";
import type { HubAction, Oid, World } from "../types";
import { repoOf } from "../world/access";
import { createWorld } from "../world/create";
import { hostedRepoId } from "../world/network";
import { act, hubActionText } from "./actions";
import { hostedRepo } from "./state";
import {
  cloneUrl,
  defaultBranch,
  hubBranches,
  hubCommitPage,
  hubCommits,
  hubFile,
  hubTree,
  resolveHubRevision,
} from "./views";

const local = (): World =>
  createWorld({
    files: { "site/index.html": "<h1>Recipes</h1>\n" },
    setup: ['cd site && git init -q && git add . && git commit -q -m "Start"'],
  });

const create = (
  world: World,
  action: Omit<Extract<HubAction, { type: "create-repository" }>, "type">,
) =>
  act(world, {
    kind: "hub",
    actor: "you",
    action: { type: "create-repository", ...action },
  });

const RECIPES = hostedRepoId("you/recipes");

describe("creating a repository on the Hub", () => {
  it("hosts an empty repository the learner can push to", () => {
    const made = create(local(), { name: "recipes" });
    expect(made.output).toEqual({ stdout: "", stderr: "", exitCode: 0 });
    expect(made.meta).toEqual({ command: "hub", counted: true });
    expect(made.effects).toEqual([
      {
        kind: "hub",
        actor: "you",
        event: { type: "repository-created", repo: "you/recipes" },
      },
    ]);
    expect(hostedRepo(made.world, "you/recipes").owner).toBe("you");
    expect(repoOf(made.world, RECIPES).refs.size).toBe(0);
    expect(made.world.seq).toBe(local().seq + 1);
    const pushed = runLine(
      made.world,
      `git remote add origin ${cloneUrl("you/recipes")}; git push -q -u origin main`,
    );
    expect(pushed.outcomes.map((o) => o.output.exitCode)).toEqual([0, 0]);
    expect(hubBranches(pushed.world, "you/recipes").map((b) => b.name)).toEqual(
      ["main"],
    );
  });

  it("makes an unrelated root commit when it adds a README, so the first push is rejected", () => {
    const made = create(local(), {
      name: "recipes",
      readme: true,
      gitignore: "node",
      license: "mit",
    });
    const tip = repoOf(made.world, RECIPES).refs.get(branchRef("main")) as Oid;
    const page = hubCommitPage(made.world, tip);
    expect(page.message).toBe("Initial commit\n");
    expect(page.parents).toEqual([]);
    expect(page.committer.name).toBe("Hub");
    expect(page.author.name).toBe("Sam Lee");
    expect(page.files.map((f) => [f.path, f.change])).toEqual([
      [".gitignore", "added"],
      ["LICENSE", "added"],
      ["README.md", "added"],
    ]);
    expect(hubFile(made.world, tip, "README.md")).toBe("# recipes\n");
    expect(hubFile(made.world, tip, "LICENSE")).toContain(
      "Copyright (c) 2026 you\n",
    );
    expect(made.effects.map((e) => e.kind)).toEqual([
      "hub",
      "object-written",
      "object-written",
      "object-written",
      "object-written",
      "object-written",
      "ref-updated",
    ]);
    const pushed = runLine(
      made.world,
      `git remote add origin ${cloneUrl("you/recipes")}; git push -u origin main`,
    ).outcomes.at(-1);
    expect(pushed?.output.stderr).toContain("(fetch first)");
  });

  it("refuses invalid and taken names without changing the Hub", () => {
    const made = create(local(), { name: "recipes" }).world;
    for (const name of ["", "..", "my recipes", "x.git", "a/b"]) {
      const out = create(made, { name });
      expect(out.output.exitCode).toBe(1);
      expect(out.effects).toEqual([{ kind: "refused", code: "hub-refused" }]);
      expect(out.world.hub).toBe(made.hub);
    }
    expect(create(made, { name: "Recipes" }).output.stderr).toBe(
      "you/Recipes already exists on the Hub.\n",
    );
  });

  it("runs through execute, reads as text and narrates", () => {
    const action: HubAction = { type: "create-repository", name: "recipes" };
    const out = execute(local(), { kind: "hub", actor: "you", action });
    expect(out.world.hub?.repos.has("you/recipes")).toBe(true);
    expect(hubActionText(action)).toBe("Hub: create repository recipes");
    expect(narrate(out.effects, out.world)).toEqual({
      whatHappened: ["You created you/recipes on the Hub."],
      announcement: "You created you/recipes on the Hub.",
    });
  });
});

describe("Hub repository views", () => {
  const world = (): World => {
    const made = create(local(), { name: "recipes", readme: true }).world;
    return runLine(
      made,
      [
        "git clone -q https://hub.test/you/recipes.git copy",
        "cd copy",
        "mkdir docs && echo guide > docs/guide.md",
        'git add . && git commit -q -m "Add the guide"',
        "git switch -q -c soup && echo soup > soup.txt",
        'git add . && git commit -q -m "Add soup" && git push -q origin main soup',
      ].join("; "),
    ).world;
  };

  it("lists branches with ahead and behind counts against the default branch", () => {
    const w = world();
    expect(defaultBranch(w, "you/recipes")).toBe("main");
    expect(
      hubBranches(w, "you/recipes").map(
        ({ name, isDefault, ahead, behind }) => ({
          name,
          isDefault,
          ahead,
          behind,
        }),
      ),
    ).toEqual([
      { name: "main", isDefault: true, ahead: 0, behind: 0 },
      { name: "soup", isDefault: false, ahead: 1, behind: 0 },
    ]);
  });

  it("shows commits, folders, files and the README at a branch or a commit", () => {
    const w = world();
    const soup = resolveHubRevision(w, "you/recipes", "soup") as Oid;
    expect(hubCommits(w, "you/recipes", soup).map((c) => c.subject)).toEqual([
      "Add soup",
      "Add the guide",
      "Initial commit",
    ]);
    const tree = hubTree(w, soup);
    expect(tree.entries.map((e) => `${e.kind}:${e.path}`)).toEqual([
      "dir:docs",
      "file:README.md",
      "file:soup.txt",
    ]);
    expect(tree.readme).toEqual({ path: "README.md", content: "# recipes\n" });
    expect(hubTree(w, soup, "docs").entries).toEqual([
      { name: "guide.md", path: "docs/guide.md", kind: "file" },
    ]);
    expect(resolveHubRevision(w, "you/recipes", soup)).toBe(soup);
    expect(resolveHubRevision(w, "you/recipes", "nope")).toBeNull();
    const page = hubCommitPage(w, soup);
    expect(page.files).toEqual([
      {
        path: "soup.txt",
        change: "added",
        binary: false,
        tooLarge: false,
        added: 1,
        deleted: 0,
        hunks: [
          {
            header: "@@ -0,0 +1 @@",
            lines: [{ sign: "+", text: "soup", old: null, new: 1 }],
          },
        ],
      },
    ]);
  });
});
