import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Oid, RefName, Repo, Signature } from "../types";
import {
  branchRef,
  isValidBranchName,
  isValidRefName,
  shortRefName,
} from "./names";
import { reflogLine } from "./reflog";
import { headBranch, resolveHead, updateRef } from "./refs";

const who: Signature = {
  name: "Sam Lee",
  email: "sam@example.com",
  time: 1767225720,
  tz: "+0000",
};
const oid = (c: string) => c.repeat(40) as Oid;
const main = branchRef("main");

const repo: Repo = {
  id: "you:/home/you/p",
  machine: "you",
  workdir: "/home/you/p",
  head: { kind: "symbolic", ref: main },
  refs: new Map(),
  reflogs: new Map(),
  index: new Map(),
  config: [],
  arrival: [],
};

describe("refs", () => {
  it("starts unborn and logs the branch and HEAD on the first commit", () => {
    expect(headBranch(repo)).toBe(main);
    expect(resolveHead(repo)).toBeNull();
    const { repo: next, effect } = updateRef(
      repo,
      main,
      oid("a"),
      who,
      "commit (initial): Add hello",
    );
    expect(resolveHead(next)).toBe(oid("a"));
    expect(effect).toEqual({
      kind: "ref-updated",
      repo: repo.id,
      ref: main,
      from: null,
      to: oid("a"),
    });
    const line =
      "0000000000000000000000000000000000000000 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa Sam Lee <sam@example.com> 1767225720 +0000\tcommit (initial): Add hello";
    expect(next.reflogs.get("HEAD")?.map(reflogLine)).toEqual([line]);
    expect(next.reflogs.get(main)?.map(reflogLine)).toEqual([line]);
    expect(repo.refs.size).toBe(0);
  });

  it("does not log HEAD for other refs and drops the log on delete", () => {
    const topic = branchRef("topic");
    const { repo: created } = updateRef(
      repo,
      topic,
      oid("b"),
      who,
      "branch: Created from HEAD",
    );
    expect(created.reflogs.has("HEAD")).toBe(false);
    const { repo: deleted, effect } = updateRef(created, topic, null, who, "");
    expect(deleted.refs.has(topic)).toBe(false);
    expect(deleted.reflogs.has(topic)).toBe(false);
    expect(effect).toMatchObject({ from: oid("b"), to: null });
    const tag = "refs/tags/v1" as RefName;
    expect(updateRef(repo, tag, oid("c"), who, "x").repo.reflogs.has(tag)).toBe(
      false,
    );
  });

  it("resolves a detached HEAD", () => {
    const detached: Repo = {
      ...repo,
      head: { kind: "detached", oid: oid("d") },
    };
    expect(headBranch(detached)).toBeNull();
    expect(resolveHead(detached)).toBe(oid("d"));
  });

  it("keeps each reflog a chain ending at the ref", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("a", "b", "c", "d"), {
          minLength: 1,
          maxLength: 20,
        }),
        (chars) => {
          let current = repo;
          for (const c of chars)
            current = updateRef(current, main, oid(c), who, "x").repo;
          const log = current.reflogs.get(main) ?? [];
          expect(log.at(-1)?.new).toBe(current.refs.get(main));
          log
            .slice(1)
            .forEach((entry, i) => expect(entry.old).toBe(log[i]?.new));
        },
      ),
    );
  });
});

describe("ref names", () => {
  it.each([
    ["main", true],
    ["feature/login", true],
    ["fix-1.2", true],
    ["-x", false],
    ["HEAD", false],
    ["a..b", false],
    ["a b", false],
    ["a~1", false],
    ["a^", false],
    ["a:b", false],
    ["a?", false],
    ["a*", false],
    ["a[", false],
    ["a\\b", false],
    ["a/", false],
    ["a.", false],
    ["a//b", false],
    [".hidden", false],
    ["x/.y", false],
    ["a.lock", false],
    ["a@{1}", false],
  ])("branch %j valid: %s", (name, valid) => {
    expect(isValidBranchName(name)).toBe(valid);
  });

  it("rejects @ alone and shortens names", () => {
    expect(isValidRefName("@")).toBe(false);
    expect(shortRefName("refs/heads/main")).toBe("main");
    expect(shortRefName("refs/remotes/origin/main")).toBe("origin/main");
    expect(shortRefName("refs/tags/v1")).toBe("v1");
    expect(shortRefName("HEAD")).toBe("HEAD");
  });
});
