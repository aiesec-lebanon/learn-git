import { describe, expect, it } from "vitest";
import { resolveHead } from "../refs/refs";
import { runLine } from "../run";
import type { World } from "../types";
import { repoIdFor, repoOf } from "./access";
import { createWorld } from "./create";
import {
  connect,
  HUB,
  hostedRepoId,
  hubName,
  missingObjects,
  transfer,
} from "./network";

const SAM = {
  global: { "user.name": "Sam Rivera", "user.email": "sam@team.test" },
};

const twoMachines = (): World =>
  createWorld({
    machines: { sam: SAM },
    hub: { "sam/team": {} },
    files: { "p/a.txt": "a\n" },
    cwd: "p",
    setup: [
      "git init -q",
      "git add a.txt",
      'git commit -q -m "One"',
      { machine: "sam", run: "mkdir s && cd s && git init -q" },
    ],
  });

describe("the simulated network", () => {
  it("reads Hub URLs with or without .git", () => {
    expect(hubName("https://hub.test/sam/team.git")).toBe("sam/team");
    expect(hubName("https://hub.test/sam/team")).toBe("sam/team");
    expect(hubName("https://hub.test/sam/team/")).toBe("sam/team");
    expect(hubName("https://example.com/sam/team.git")).toBeNull();
    expect(hubName("../team")).toBeNull();
  });

  it("hosts empty bare repositories on the Hub machine", () => {
    const world = twoMachines();
    const hosted = repoOf(world, hostedRepoId("sam/team"));
    expect(hosted).toMatchObject({ machine: HUB, bare: true });
    expect(hosted.head).toEqual({ kind: "symbolic", ref: "refs/heads/main" });
    expect(world.machines.has("sam")).toBe(true);
    expect(world.machines.get("sam")?.home).toBe("/home/sam");
  });

  it("runs setup lines on the machine they name", () => {
    const world = twoMachines();
    expect(world.repos.has(repoIdFor("sam", "/home/sam/s"))).toBe(true);
  });

  it("connects to hosted repositories and words each failure as Git does", () => {
    const world = twoMachines();
    expect(connect(world, "https://hub.test/sam/team")).toMatchObject({
      ok: true,
    });
    expect(connect(world, "https://hub.test/sam/nope.git")).toEqual({
      ok: false,
      stderr: "fatal: repository 'https://hub.test/sam/nope.git/' not found\n",
    });
    expect(connect(world, "https://example.com/x.git")).toMatchObject({
      stderr:
        "fatal: unable to access 'https://example.com/x.git/': Could not resolve host: example.com\n",
    });
    expect(connect(world, "nope")).toMatchObject({
      stderr: expect.stringContaining(
        "fatal: 'nope' does not appear to be a git repository\n",
      ),
    });
  });

  it("transfers only what the target lacks and records the arrival", () => {
    const world = twoMachines();
    const local = repoIdFor("you", "/home/you/p");
    const hosted = hostedRepoId("sam/team");
    const tip = resolveHead(repoOf(world, local));
    if (!tip) throw new Error("no commit");
    const sent = transfer(world, local, hosted, [tip], "push");
    const oids = [...(world.available.get(local) ?? [])];
    expect(sent.effects).toEqual([
      {
        kind: "transfer",
        from: local,
        to: hosted,
        oids: expect.arrayContaining(oids),
        direction: "push",
      },
    ]);
    expect(sent.world.available.get(hosted)).toEqual(new Set(oids));
    expect(repoOf(sent.world, hosted).arrival).toEqual([tip]);
    expect(transfer(sent.world, local, hosted, [tip], "push").effects).toEqual(
      [],
    );
  });

  it("stops walking at commits the target already has", () => {
    const first = twoMachines();
    const local = repoIdFor("you", "/home/you/p");
    const one = resolveHead(repoOf(first, local));
    const world = runLine(
      first,
      'echo b > b.txt; git add b.txt; git commit -q -m "Two"',
    ).world;
    const two = resolveHead(repoOf(world, local));
    if (!one || !two) throw new Error("no commits");
    const have = first.available.get(local) ?? new Set();
    const missing = missingObjects(world.objects, have, [two]);
    expect(missing.commits).toEqual([two]);
    expect(missing.all).toHaveLength(3);
  });

  it("keeps objects per repository", () => {
    const world = twoMachines();
    const sam = repoIdFor("sam", "/home/sam/s");
    expect(world.available.get(sam)).toBeUndefined();
    expect(world.available.get(repoIdFor("you", "/home/you/p"))?.size).toBe(3);
  });
});
