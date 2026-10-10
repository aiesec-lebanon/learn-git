import { describe, expect, it } from "vitest";
import { createRegistry, defineCommand } from "../commands/registry";
import { recordedFixtures } from "../test/fixtures";
import type { Repo, World } from "../types";
import { repoIdFor, withRepo, machineOf } from "../world/access";
import { createWorld } from "../world/create";
import { dispatchGit } from "./dispatch";
import { lastValue } from "./options";

const where = defineCommand({
  name: "where",
  counted: true,
  needsRepo: true,
  usage: "usage: git where [-v]",
  options: [{ key: "verbose", short: "v", long: "verbose" }],
  run: ({ repo, machine, options }) => ({
    stdout: `${repo.workdir} ${machine.cwd} ${String(lastValue(options, "verbose") ?? false)}\n`,
  }),
});
const touch = defineCommand({
  name: "touchy",
  counted: false,
  needsRepo: false,
  usage: "usage: git touchy",
  options: [],
  run: ({ world, machine }) => ({
    world: { ...world, machines: new Map([[machine.id, machine]]) },
  }),
});
const registry = createRegistry([where, touch]);

const world = createWorld({ dirs: ["p/src", "other"], cwd: "p/src" });
const repo: Repo = {
  id: repoIdFor("you", "/home/you/p"),
  machine: "you",
  workdir: "/home/you/p",
  head: {
    kind: "symbolic",
    ref: "refs/heads/main" as Repo["refs"] extends ReadonlyMap<infer K, unknown>
      ? K
      : never,
  },
  refs: new Map(),
  reflogs: new Map(),
  index: new Map(),
  config: [],
  arrival: [],
};
const inRepo: World = withRepo(world, repo);

const run = (w: World, line: string) =>
  dispatchGit(w, machineOf(w), line.split(" ").filter(Boolean), 0, registry);

describe("dispatchGit", () => {
  it("runs a command with options in the discovered repository", () => {
    expect(run(inRepo, "where -v")).toMatchObject({
      stdout: "/home/you/p /home/you/p/src true\n",
      command: "git where",
      counted: true,
    });
  });

  it("refuses outside a repository", () => {
    expect(run(world, "where")).toMatchObject({
      stderr:
        "fatal: not a git repository (or any of the parent directories): .git\n",
      exitCode: 128,
      effects: [{ kind: "refused", code: "not-a-repository" }],
    });
  });

  it("handles -C without changing the shell's directory", () => {
    expect(run(inRepo, "-C .. where").stdout).toBe(
      "/home/you/p /home/you/p false\n",
    );
    expect(run(inRepo, "-C /home/you/other where").exitCode).toBe(128);
    expect(run(inRepo, "-C nowhere where").stderr).toBe(
      "fatal: cannot change to 'nowhere': No such file or directory\n",
    );
    expect(run(inRepo, "-C").exitCode).toBe(129);
    const result = run(inRepo, "-C .. touchy");
    expect(result.world && machineOf(result.world).cwd).toBe("/home/you/p/src");
  });

  it("prints usage, version and option errors", () => {
    expect(run(world, "")).toMatchObject({ exitCode: 1 });
    expect(
      run(world, "")?.stdout?.startsWith("usage: git [-v | --version]"),
    ).toBe(true);
    expect(run(world, "--version").stdout).toBe(
      "git version 2.45.1.windows.1\n",
    );
    expect(run(world, "version").stdout).toBe("git version 2.45.1.windows.1\n");
    expect(run(world, "--no-pager --version").stdout).toBe(
      "git version 2.45.1.windows.1\n",
    );
    expect(
      run(world, "--foo").stderr?.startsWith(
        "unknown option: --foo\nusage: git",
      ),
    ).toBe(true);
    expect(run(world, "-c x=y status")).toMatchObject({
      exitCode: 1,
      stderr: "not simulated here: git -c\n",
    });
    expect(run(inRepo, "where --bogus")).toMatchObject({
      exitCode: 129,
      stderr: "error: unknown option `bogus'\nusage: git where [-v]\n\n",
    });
  });

  it("routes help to the reference", () => {
    expect(run(world, "help commit").request).toEqual({
      kind: "open-reference",
      entryId: "commit",
    });
    expect(run(world, "help").request).toEqual({
      kind: "open-reference",
      entryId: "git",
    });
    expect(run(world, "--help").request).toEqual({
      kind: "open-reference",
      entryId: "git",
    });
    expect(run(world, "where -h").request).toEqual({
      kind: "open-reference",
      entryId: "where",
    });
    expect(run(inRepo, "where -v -h").request).toEqual({
      kind: "open-reference",
      entryId: "where",
    });
    expect(run(world, "where --help").request).toEqual({
      kind: "open-reference",
      entryId: "where",
    });
  });

  it("answers later commands with what Git would do", () => {
    expect(run(world, "bisect start")).toMatchObject({
      exitCode: 1,
      stderr:
        "not simulated here: git bisect (in Git: use binary search to find the commit that introduced a bug)\n",
      effects: [{ kind: "refused", code: "not-simulated" }],
    });
    expect(run(world, "lfs").stderr).toBe("not simulated here: git lfs\n");
  });

  it("suggests similar commands like the recorded Git", () => {
    const typos = recordedFixtures.find((f) => f.id === "cli/typos");
    const steps =
      typos?.steps.filter((s) => s.stderr.includes("is not a git command")) ??
      [];
    expect(steps.length).toBeGreaterThan(5);
    for (const step of steps) {
      const result = run(world, step.cmd.replace(/^git /, ""));
      expect(result.stderr).toBe(step.stderr);
      expect(result.exitCode).toBe(step.exitCode);
    }
    expect(run(world, "statsu").stderr).toContain(
      "The most similar command is\n\tstatus\n",
    );
    expect(run(world, "qqqqqq").stderr).toBe(
      "git: 'qqqqqq' is not a git command. See 'git --help'.\n",
    );
  });
});
