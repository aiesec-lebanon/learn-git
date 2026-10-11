import { expect, it } from "vitest";
import { Session } from "../session";
import type { SetupStep, WorldSpec } from "../types";
import { createWorld } from "../world/create";

/** ADR-014: p95 per command 50 ms on an E14 world; CI fails only at 3x until PERF_STRICT=1. */
const BUDGET_MS = 50 * (process.env.PERF_STRICT ? 1 : 3);
const URL = "https://hub.test/team/big.git";
const TEAM = ["ana", "ben", "cy", "dee"];

const identity = (name: string) => ({
  "user.name": name,
  "user.email": `${name}@team.test`,
  "init.defaultBranch": "main",
});

/** 200 files, 300 commits on two branches, a Hub repository and four teammates' clones. */
function e14(): WorldSpec {
  const files: Record<string, string> = {};
  for (let i = 0; i < 200; i++) {
    files[`big/src/dir${i % 10}/file${i}.txt`] =
      `line one of ${i}\nline two\nline three\n`;
  }
  const setup: SetupStep[] = [
    "cd big",
    "git init -q",
    "git add .",
    'git commit -q -m "Start"',
  ];
  for (let i = 1; i < 300; i++) {
    if (i === 150) setup.push("git switch -q -c topic");
    if (i === 250) setup.push("git switch -q main", "git merge -q topic");
    const j = (i * 7) % 200;
    setup.push(
      `echo "change ${i}" >> src/dir${j % 10}/file${j}.txt`,
      `git commit -q -am "Change ${i}"`,
    );
  }
  setup.push(`git remote add origin ${URL}`, "git push -q -u origin main");
  for (const id of TEAM)
    setup.push({ machine: id, run: `git clone -q ${URL}` });
  return {
    files,
    global: identity("you"),
    machines: Object.fromEntries(
      TEAM.map((id) => [id, { global: identity(id) }]),
    ),
    hub: { "team/big": {} },
    setup,
  };
}

const LINES = [
  "git status",
  "echo more >> src/dir1/file1.txt",
  "git diff",
  "git add .",
  "git status",
  'git commit -m "Edit file1"',
  "git log --oneline",
  "git log --oneline --graph --all",
  "git show HEAD",
  "git switch -c feature",
  "echo idea > src/new.txt",
  "git add src/new.txt",
  'git commit -m "Add an idea"',
  "git switch main",
  "git merge feature",
  "git branch",
  "git fetch",
  "git status",
  "git push",
  "git pull",
  "git restore --staged .",
  "git branch -d feature",
  "git log --oneline -n 5",
];

it("runs Beginner commands on an E14 world within the per-command budget", () => {
  const session = new Session(createWorld(e14()));
  const world = session.getSnapshot().world;
  expect(world.repos.size).toBe(6);
  for (const line of LINES.slice(0, 3)) session.run(line);
  const times$: string[] = [];
  const times = LINES.map((line) => {
    const start = performance.now();
    const [entry] = session.run(line);
    const took = performance.now() - start;
    const refused = entry?.outcome.effects.some((e) => e.kind === "refused");
    expect(refused, `${line}: ${entry?.outcome.output.stderr}`).toBe(false);
    times$.push(`${line} ${took.toFixed(1)}`);
    return took;
  }).sort((a, b) => a - b);
  const p95 = times[Math.ceil(times.length * 0.95) - 1] ?? 0;
  expect(p95, `p95 ${p95.toFixed(1)} ms; ${times$.join(", ")}`).toBeLessThan(
    BUDGET_MS,
  );
});
