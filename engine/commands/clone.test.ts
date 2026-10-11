import { describe, expect, it } from "vitest";
import { runLine } from "../run";
import type { RefName, World } from "../types";
import { asSam, publish, TEAM, TEAM_URL, teamWorld } from "../test/network";
import { repoIdFor, repoOf } from "../world/access";
import { createWorld } from "../world/create";
import { guessDir } from "./clone";

const URL = TEAM_URL;

const published = () =>
  publish(
    asSam(
      teamWorld(),
      'echo "# Team" > README.md && git add . && git commit -q -m "Add README" && git switch -q -c docs && echo d > docs.txt && git add . && git commit -q -m "Add docs" && git switch -q main',
    ),
  );

const run = (world: World, line: string) => {
  const ran = runLine(world, line);
  return { world: ran.world, last: ran.outcomes.at(-1) };
};

describe("git clone", () => {
  it("names the folder after the URL", () => {
    expect(guessDir("https://hub.test/sam/team.git")).toBe("team");
    expect(guessDir("https://hub.test/sam/team/")).toBe("team");
    expect(guessDir("https://hub.test/sam/team/.git")).toBe("team");
  });

  it("copies every branch as a remote-tracking branch and checks out the default", () => {
    const { world, last } = run(published(), `git clone ${URL}`);
    expect(last?.output).toEqual({
      stdout: "",
      stderr: "Cloning into 'team'...\n",
      exitCode: 0,
    });
    const repo = repoOf(world, repoIdFor("you", "/home/you/team"));
    expect([...repo.refs.keys()].sort()).toEqual([
      "refs/heads/main",
      "refs/remotes/origin/docs",
      "refs/remotes/origin/main",
    ]);
    expect(repo.symrefs?.get("refs/remotes/origin/HEAD" as RefName)).toBe(
      "refs/remotes/origin/main",
    );
    expect(repo.config.slice(-4)).toEqual([
      { key: "remote.origin.url", value: URL },
      {
        key: "remote.origin.fetch",
        value: "+refs/heads/*:refs/remotes/origin/*",
      },
      { key: "branch.main.remote", value: "origin" },
      { key: "branch.main.merge", value: "refs/heads/main" },
    ]);
    expect([...repo.reflogs.keys()].sort()).toEqual([
      "HEAD",
      "refs/heads/main",
      "refs/remotes/origin/HEAD",
    ]);
    expect(repo.reflogs.get("HEAD")?.[0]?.message).toBe(`clone: from ${URL}`);
    expect(
      world.machines.get("you")?.fs.files.get("/home/you/team/README.md"),
    ).toBe("# Team\n");
    expect(world.available.get(repo.id)).toEqual(world.available.get(TEAM));
    expect(repo.arrival).toEqual(repoOf(world, TEAM).arrival);
    expect(last?.effects.map((e) => e.kind)).toContain("transfer");
    const log = runLine(world, "cd team; git log --oneline --all").outcomes.at(
      -1,
    );
    expect(log?.output.stdout).toMatch(
      /^\w{7} \(origin\/docs\) Add docs\n\w{7} \(HEAD -> main, origin\/main, origin\/HEAD\) Add README\n$/,
    );
  });

  it("warns about an empty repository and still links the default branch", () => {
    const empty = createWorld({ hub: { "sam/team": {} } });
    const { world, last } = run(empty, `git clone -q ${URL} mine`);
    expect(last?.output.stderr).toBe(
      "warning: You appear to have cloned an empty repository.\n",
    );
    const repo = repoOf(world, repoIdFor("you", "/home/you/mine"));
    expect(repo.refs.size).toBe(0);
    expect(repo.head).toEqual({ kind: "symbolic", ref: "refs/heads/main" });
    expect(repo.config.at(-1)).toEqual({
      key: "branch.main.merge",
      value: "refs/heads/main",
    });
  });

  it("refuses as Git does", () => {
    const world = published();
    const stderr = (line: string) => run(world, line).last?.output.stderr;
    expect(stderr(`mkdir team; touch team/x; git clone ${URL}`)).toBe(
      "fatal: destination path 'team' already exists and is not an empty directory.\n",
    );
    expect(stderr("git clone https://hub.test/sam/nope.git")).toBe(
      "Cloning into 'nope'...\nfatal: repository 'https://hub.test/sam/nope.git/' not found\n",
    );
    expect(stderr("git clone ../elsewhere")).toBe(
      "fatal: repository '../elsewhere' does not exist\n",
    );
    expect(stderr("git clone")).toContain(
      "fatal: You must specify a repository to clone.",
    );
    expect(stderr(`git clone --depth 1 ${URL}`)).toBe(
      "not simulated here: git clone --depth\n",
    );
    expect(
      run(world, `mkdir team; git clone ${URL}`).last?.output.exitCode,
    ).toBe(0);
  });
});
