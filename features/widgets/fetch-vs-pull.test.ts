import { describe, expect, it } from "vitest";
import { createWorld, runLine, type World } from "@/engine";
import { fetchVsPull, pullModes } from "./fetch-vs-pull.model";

const URL = "https://hub.test/sam/team.git";
const team = (): World =>
  createWorld({
    machines: {
      sam: {
        global: {
          "user.name": "Sam",
          "user.email": "sam@team.test",
          "init.defaultBranch": "main",
        },
      },
    },
    hub: { "sam/team": {} },
    setup: [
      {
        machine: "sam",
        run: `git clone -q ${URL} && cd team && echo a > a.txt && git add . && git commit -q -m One && git push -q`,
      },
      `git clone -q ${URL}`,
      "cd team",
      {
        machine: "sam",
        run: "cd /home/sam/team && echo b >> a.txt && git commit -q -am Two && git push -q",
      },
    ],
  });

describe("fetch versus pull", () => {
  it("previews both from one start without running either", () => {
    const world = team();
    const [fetch, pull] = fetchVsPull(world);
    expect(fetch.outcome).toBe(
      "origin/main moves; your branch and files stay as they were.",
    );
    expect(pull.outcome).toMatch(
      /^main fast-forwards to \w{7}; your files update too\.$/,
    );
    expect(fetch.view?.labels.find((l) => l.name === "main")?.note).toBe(
      "behind 1",
    );
    expect(world.repos.get("you:/home/you/team")?.fetchHead).toBeUndefined();
  });

  it("shows each pull mode's outcome on diverged branches", () => {
    const diverged = runLine(
      team(),
      "echo m > m.txt; git add m.txt; git commit -q -m Mine",
    ).world;
    expect(
      pullModes(diverged).map((p) => [
        p.command,
        p.ok,
        p.outcome.split(" ")[0],
      ]),
    ).toEqual([
      ["git pull --no-rebase", true, "Makes"],
      ["git pull --rebase", true, "Replays"],
      ["git pull --ff-only", false, "Git"],
    ]);
    expect(fetchVsPull(diverged)[1].outcome).toBe(
      "Git stops and asks how to combine: both sides have new commits.",
    );
  });
});
