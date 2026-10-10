import { describe, expect, it } from "vitest";
import { recordedFixtures } from "../test/fixtures";
import { importObject } from "../test/import";
import type { FileMode, GitObject, Oid, RepoPath } from "../types";
import { compareBytes } from "../util/compare";
import { abbreviate } from "./abbrev";
import { hashObject, ZERO_OID } from "./hash";
import { addObjects, readObject } from "./pool";
import { commitText } from "./serialize";
import { buildTree, flattenTree } from "./tree";

const recordedRepos = recordedFixtures.flatMap((f) =>
  Object.entries(f.final.repos).map(
    ([name, repo]) => [`${f.id} ${name}`, repo] as const,
  ),
);

describe("Git objects", () => {
  it("hashes hello\\n like Git", () => {
    expect(hashObject({ type: "blob", content: "hello\n" })).toBe(
      "ce013625030ba8dba906f756967f9e9ca394464a",
    );
    expect(hashObject({ type: "blob", content: "" })).toBe(
      "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391",
    );
    expect(hashObject({ type: "tree", entries: [] })).toBe(
      "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
    );
    expect(ZERO_OID).toHaveLength(40);
  });

  it.each(recordedRepos)(
    "re-serializes every recorded object to its ID (%s)",
    (_, repo) => {
      for (const [oid, recorded] of Object.entries(repo.objects)) {
        const object = importObject(recorded);
        expect(hashObject(object)).toBe(oid);
        if (object.type === "commit" && recorded.type === "commit") {
          expect(commitText(object)).toBe(recorded.body);
        }
      }
    },
  );

  it.each(recordedRepos.filter(([id]) => id.startsWith("objects/")))(
    "builds the recorded root tree from the index (%s)",
    (_, repo) => {
      const files = new Map(
        repo.index.map((e) => [
          e.path as RepoPath,
          { oid: e.oid as Oid, mode: e.mode as FileMode },
        ]),
      );
      const head = repo.refs["refs/heads/main"] as Oid;
      const commit = importObject(
        repo.objects[head] ?? { type: "blob", body: "" },
      );
      const { root, trees } = buildTree(files);
      expect(commit.type === "commit" && commit.tree).toBe(root);
      const { pool } = addObjects(
        new Map(),
        Object.values(repo.objects).map(importObject),
      );
      expect(trees.every((t) => pool.has(hashObject(t)))).toBe(true);
      expect([...flattenTree(pool, root)]).toEqual([...files]);
    },
  );

  it("sorts tree entries with folders compared as name/", () => {
    const blob = hashObject({ type: "blob", content: "" });
    const files = new Map<RepoPath, { oid: Oid; mode: FileMode }>(
      ["a0", "a/b", "a.txt", "B"].map((p) => [
        p as RepoPath,
        { oid: blob, mode: "100644" },
      ]),
    );
    const { trees } = buildTree(files);
    expect(trees.at(-1)?.entries.map((e) => e.name)).toEqual([
      "B",
      "a.txt",
      "a",
      "a0",
    ]);
  });

  it("compares names by UTF-8 bytes", () => {
    expect(compareBytes("￿", "\u{10000}")).toBeLessThan(0);
    expect("￿" < "\u{10000}").toBe(false);
    expect(compareBytes("a", "ab")).toBeLessThan(0);
    expect(compareBytes("ab", "a")).toBeGreaterThan(0);
    expect(compareBytes("x", "x")).toBe(0);
  });
});

describe("object pool", () => {
  const blob: GitObject = { type: "blob", content: "x\n" };

  it("appends only new objects and keeps the old pool unchanged", () => {
    const empty = new Map();
    const first = addObjects(empty, [blob, blob]);
    expect(first.added).toHaveLength(1);
    expect(empty.size).toBe(0);
    const again = addObjects(first.pool, [blob]);
    expect(again.pool).toBe(first.pool);
    expect(again.added).toEqual([]);
    expect(readObject(first.pool, hashObject(blob), "blob")).toBe(blob);
    expect(() => readObject(first.pool, hashObject(blob), "tree")).toThrow(
      /Expected tree/,
    );
  });

  it("abbreviates to 7 characters and lengthens on ambiguity", () => {
    const ids = ["ce01362503", "ce01362aaa", "ce01362aab", "ffffffffff"].map(
      (p) => p.padEnd(40, "0") as Oid,
    );
    const pool = new Map(ids.map((id) => [id, blob]));
    expect(abbreviate(pool, ids[0] as Oid)).toBe("ce013625");
    expect(abbreviate(pool, ids[1] as Oid)).toBe("ce01362aaa");
    expect(abbreviate(pool, ids[3] as Oid)).toBe("fffffff");
    expect(abbreviate(new Map(), ids[3] as Oid)).toBe("fffffff");
  });
});
