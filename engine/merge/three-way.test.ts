import { describe, expect, it } from "vitest";
import { buildTree } from "../objects/tree";
import { writeObjects } from "../objects/write";
import { hashObject } from "../objects/hash";
import { runLine } from "../run";
import type { Commit, Oid, RefName, RepoPath, World } from "../types";
import { withEntry } from "../util/cow";
import { withRepo } from "../world/access";
import { createWorld } from "../world/create";

/** A repository whose `other` branch shares no history with main. */
function unrelated(): World {
  const world = createWorld({
    files: { "p/a.txt": "a\n" },
    cwd: "p",
    setup: ["git init -q", "git add .", 'git commit -q -m "One"'],
  });
  const repo = [...world.repos.values()][0];
  if (!repo) throw new Error("no repo");
  const blob = { type: "blob", content: "b\n" } as const;
  const tree = buildTree(
    new Map([
      ["b.txt" as RepoPath, { oid: hashObject(blob), mode: "100644" as const }],
    ]),
  );
  const sig = { name: "Sam", email: "s@e", time: 1, tz: "+0000" };
  const root: Commit = {
    type: "commit",
    tree: tree.root,
    parents: [],
    author: sig,
    committer: sig,
    message: "Other\n",
  };
  const written = writeObjects(world, repo.id, [blob, ...tree.trees, root]);
  const oid = written.oids.at(-1) as Oid;
  return withRepo(written.world, {
    ...repo,
    refs: withEntry(repo.refs, "refs/heads/other" as RefName, oid),
    arrival: [...repo.arrival, oid],
  });
}

describe("merging unrelated histories", () => {
  it("refuses without the flag and merges with it", () => {
    const refused = runLine(unrelated(), "git merge other").outcomes[0];
    expect(refused?.output).toEqual({
      stdout: "",
      stderr: "fatal: refusing to merge unrelated histories\n",
      exitCode: 128,
    });
    const merged = runLine(
      unrelated(),
      "git merge --allow-unrelated-histories other",
    ).outcomes[0];
    expect(merged?.output.stdout).toBe(
      "Merge made by the 'ort' strategy.\n b.txt | 1 +\n 1 file changed, 1 insertion(+)\n create mode 100644 b.txt\n",
    );
  });
});
