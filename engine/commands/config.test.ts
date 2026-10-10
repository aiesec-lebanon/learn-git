import { describe, expect, it } from "vitest";
import { resolveIdentity } from "../config/identity";
import { runLine } from "../run";
import type { World, WorldSpec } from "../types";
import { machineOf } from "../world/access";
import { createWorld } from "../world/create";

function run(lines: string[], spec: WorldSpec = { dirs: ["p"], cwd: "p" }) {
  let world: World = createWorld(spec);
  const outcomes = lines.map((line) => {
    const result = runLine(world, line);
    world = result.world;
    return result.outcomes.at(-1);
  });
  return { world, outcomes, last: outcomes.at(-1) };
}

const text = (r: ReturnType<typeof run>) =>
  `${r.last?.output.stdout ?? ""}${r.last?.output.stderr ?? ""}`;

describe("git config", () => {
  it("supports the Git 2.46 subcommands", () => {
    const r = run([
      "git init -q",
      "git config set user.name 'Pat Doe'",
      "git config set --global core.editor nano",
      "git config get user.name",
    ]);
    expect(text(r)).toBe("Pat Doe\n");
    expect(r.outcomes[1]?.effects).toEqual([
      {
        kind: "config-changed",
        scope: "local",
        target: "you:/home/you/p",
        key: "user.name",
        from: null,
        to: "Pat Doe",
      },
    ]);
    expect(
      text(run(["git init -q", "git config list --local --show-scope"])),
    ).toContain("local\tcore.bare=false\n");
    const unset = run([
      "git init -q",
      "git config set a.b c",
      "git config unset a.b",
      "git config get a.b",
    ]);
    expect(unset.last?.output.exitCode).toBe(1);
    expect(
      run(["git config unset --global nope.key"]).last?.output.exitCode,
    ).toBe(5);
  });

  it("reports wrong argument counts for subcommands", () => {
    const r = run(["git config get"]);
    expect(r.last?.output).toMatchObject({ exitCode: 129 });
    expect(text(r)).toBe(
      "error: wrong number of arguments, should be 1\nusage: git config get [<file-option>] [<display-option>] [--includes] [--all] [--regexp] [--value=<value>] [--fixed-value] [--default=<default>] <name>\n\n",
    );
    expect(run(["git config --list extra"]).last?.output.exitCode).toBe(129);
    expect(run(["git config"]).last?.output.exitCode).toBe(129);
    expect(run(["git config --unset"]).last?.output.exitCode).toBe(129);
  });

  it("notes the legacy set form and skips unchanged values", () => {
    const r = run(["git config --global user.name 'Sam Lee'"]);
    expect(r.last?.notes).toEqual([
      "Older form of: git config set user.name 'Sam Lee' (Git 2.46 and later)",
    ]);
    expect(r.last?.effects).toEqual([]);
  });

  it.each([
    ["git config --system core.editor vim", 255],
    ["git config --system --unset core.editor", 255],
    ["git config --file x.cfg a.b c", 1],
    ["git config --get user.name Sam", 1],
    ["git config --unset user.name Sam", 1],
    ["git config a.b c d", 1],
    ["git config --global --get-all user.name", 1],
  ])("%s exits %i", (line, code) => {
    expect(run([line]).last?.output.exitCode).toBe(code);
  });

  it("reads a system preset first and prints bare keys", () => {
    const r = run(["git config --list --show-scope"], {
      system: { "core.editor": "nano" },
      global: {},
    });
    expect(text(r)).toBe("system\tcore.editor=nano\n");
    const world = createWorld({ global: {} });
    const machine = machineOf(world);
    const bare = { ...machine, config: [{ key: "core.bare", value: null }] };
    expect(resolveIdentity(world, bare, null)).toMatchObject({ ok: false });
  });
});

describe("identity", () => {
  it("falls back to the account name without user.name", () => {
    const world = createWorld({ global: { "user.email": "e@example.com" } });
    expect(resolveIdentity(world, machineOf(world), null)).toEqual({
      ok: true,
      ident: { name: "you", email: "e@example.com" },
    });
  });
});

describe("git init", () => {
  it.each([
    ["git init --bare", "not simulated here: git init --bare\n"],
    ["git init a b", "usage: git init [-q | --quiet]"],
    [
      "git init .git/x",
      "not simulated here: files inside .git (Git's own storage)\n",
    ],
  ])("%s", (line, out) => {
    expect(text(run([line]))).toContain(out);
  });

  it("creates a nested repository with its own effects", () => {
    const r = run(["git init -q", "mkdir sub", "git init sub"]);
    expect(r.world.repos.size).toBe(2);
    expect(r.last?.effects).toEqual([
      {
        kind: "files-changed",
        machine: "you",
        changes: [
          { path: "/home/you/p/sub/.git", change: "added", node: "dir" },
        ],
      },
      {
        kind: "repo-created",
        repo: "you:/home/you/p/sub",
        reinitialized: false,
      },
    ]);
  });
});
