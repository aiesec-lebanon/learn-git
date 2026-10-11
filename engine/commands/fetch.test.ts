import { describe, expect, it } from "vitest";
import { abbreviate } from "../objects/abbrev";
import { runLine } from "../run";
import { asSam, publish, TEAM, TEAM_URL, teamWorld } from "../test/network";
import type { Oid, RefName, World } from "../types";
import { repoIdFor, repoOf, withRepo } from "../world/access";

const MINE = repoIdFor("you", "/home/you/team");

/** Sam's main and docs on the Hub, cloned into `~/team`. */
function cloned(): World {
  const world = publish(
    asSam(
      teamWorld(),
      'echo "# Team" > README.md && git add . && git commit -q -m "Add README" && git switch -q -c docs && echo d > docs.txt && git add . && git commit -q -m "Add docs" && git switch -q main',
    ),
  );
  return runLine(world, `git clone -q ${TEAM_URL}; cd team`).world;
}

const run = (world: World, line: string) => {
  const ran = runLine(world, line);
  return { world: ran.world, last: ran.outcomes.at(-1) };
};

const ref = (world: World, name: string) =>
  repoOf(world, MINE).refs.get(name as RefName) as Oid;
const short = (world: World, oid: Oid) => abbreviate(world.objects, oid);

describe("git fetch", () => {
  it("updates remote-tracking branches only, with Git's lines and reflog", () => {
    const start = cloned();
    const before = ref(start, "refs/remotes/origin/main");
    const pushed = publish(
      asSam(
        start,
        'echo "Fridays" >> README.md && git commit -q -am "Meet" && git switch -q -c feature && echo f > f.txt && git add . && git commit -q -m "Feature"',
      ),
    );
    const { world, last } = run(pushed, "git fetch");
    const after = ref(world, "refs/remotes/origin/main");
    const feature = ref(world, "refs/remotes/origin/feature");
    expect(last?.output.stderr).toBe(
      `From https://hub.test/sam/team\n   ${short(world, before)}..${short(world, after)}  main       -> origin/main\n * [new branch]      feature    -> origin/feature\n`,
    );
    expect(ref(world, "refs/heads/main")).toBe(before);
    const repo = repoOf(world, MINE);
    expect(repo.reflogs.get("refs/remotes/origin/main")?.at(-1)?.message).toBe(
      "fetch: fast-forward",
    );
    expect(repo.reflogs.get("refs/remotes/origin/feature")?.[0]?.message).toBe(
      "fetch: storing head",
    );
    expect(repo.fetchHead).toBe(
      `${after}\t\tbranch 'main' of https://hub.test/sam/team\n${ref(world, "refs/remotes/origin/docs")}\tnot-for-merge\tbranch 'docs' of https://hub.test/sam/team\n${feature}\tnot-for-merge\tbranch 'feature' of https://hub.test/sam/team\n`,
    );
    expect(last?.effects.map((e) => e.kind)).toEqual([
      "transfer",
      "ref-updated",
      "ref-updated",
    ]);
    expect(run(world, "git fetch").last?.output.stderr).toBe("");
  });

  it("prunes branches deleted on the remote", () => {
    const start = cloned();
    const hosted = repoOf(start, TEAM);
    const refs = new Map(hosted.refs);
    refs.delete("refs/heads/docs" as RefName);
    const world = withRepo(start, { ...hosted, refs });
    expect(run(world, "git fetch").last?.output.stderr).toBe("");
    const { last, world: after } = run(world, "git fetch --prune");
    expect(last?.output.stderr).toBe(
      "From https://hub.test/sam/team\n - [deleted]         (none)     -> origin/docs\n",
    );
    expect(repoOf(after, MINE).reflogs.has("refs/remotes/origin/docs")).toBe(
      false,
    );
  });

  it("names forced updates", () => {
    const start = cloned();
    const hosted = repoOf(start, TEAM);
    const main = ref(start, "refs/remotes/origin/main");
    const docs = ref(start, "refs/remotes/origin/docs");
    const moved = new Map(hosted.refs).set("refs/heads/docs" as RefName, main);
    const world = withRepo(start, { ...hosted, refs: moved });
    expect(run(world, "git fetch origin").last?.output.stderr).toBe(
      `From https://hub.test/sam/team\n + ${short(world, docs)}...${short(world, main)} docs       -> origin/docs  (forced update)\n`,
    );
  });

  it("fetches named branches into FETCH_HEAD", () => {
    const { world, last } = run(cloned(), "git fetch origin docs main");
    expect(last?.output.stderr).toBe(
      "From https://hub.test/sam/team\n * branch            docs       -> FETCH_HEAD\n * branch            main       -> FETCH_HEAD\n",
    );
    expect(repoOf(world, MINE).fetchHead?.split("\n")[0]).toMatch(
      /^\w{40}\t\tbranch 'docs' of https:\/\/hub.test\/sam\/team$/,
    );
  });

  it("refuses as Git does", () => {
    const world = cloned();
    const out = (line: string) => run(world, line).last?.output;
    expect(out("git fetch nope")?.stderr).toContain(
      "fatal: 'nope' does not appear to be a git repository\n",
    );
    expect(out("git fetch origin nope")).toEqual({
      stdout: "",
      stderr: "fatal: couldn't find remote ref nope\n",
      exitCode: 128,
    });
    expect(run(world, "git fetch origin nope").world).not.toBe(world);
    expect(out("git fetch --all origin")?.stderr).toBe(
      "fatal: fetch --all does not take a repository argument\n",
    );
    expect(out("git fetch --depth 1")?.stderr).toBe(
      "not simulated here: git fetch --depth\n",
    );
    expect(out("cd ..; git init -q solo; cd solo; git fetch")).toEqual({
      stdout: "",
      stderr: "",
      exitCode: 0,
    });
  });

  it("prints each remote's name when fetching several", () => {
    const world = run(cloned(), `git remote add upstream ${TEAM_URL}`).world;
    const { last } = run(world, "git fetch --all");
    expect(last?.output.stdout).toBe("Fetching origin\nFetching upstream\n");
    expect(last?.output.stderr).toContain(
      " * [new branch]      docs       -> upstream/docs\n",
    );
  });
});
