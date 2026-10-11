import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { teamRepo, teamRepoBeforeClone, teamRepoPlayground } from "./team-repo";

const hosted = "hub:/sam/bake-sale.git";

describe("the Team repo world", () => {
  it("hosts Sam's main and docs, with no clone of yours yet", () => {
    const world = createWorld(teamRepoBeforeClone);
    expect([...(world.repos.get(hosted)?.refs.keys() ?? [])].sort()).toEqual([
      "refs/heads/docs",
      "refs/heads/main",
    ]);
    expect(world.repos.has("you:/home/you/bake-sale")).toBe(false);
    expect(createWorld(teamRepo).repos.has("you:/home/you/bake-sale")).toBe(
      true,
    );
  });

  it("lets Sam push while you work in the playground", () => {
    const session = new Session(createWorld(teamRepoPlayground));
    session.run("git status");
    const ran = session.run("git log --oneline");
    expect(ran.at(-1)?.actor).toBe("Sam");
    const fetched = session.run("git fetch");
    expect(fetched[0]?.outcome.output.stderr).toContain(
      "main       -> origin/main",
    );
    for (const line of ["ls", "ls", "ls"]) session.run(line);
    const log =
      session.run("git log --oneline origin/main")[0]?.outcome.output.stdout ??
      "";
    expect(log).not.toContain("Raise the lemon cake price");
    const tips = session.getSnapshot().world.repos.get(hosted);
    const main = tips?.refs.get("refs/heads/main" as never);
    const commit = main ? session.getSnapshot().world.objects.get(main) : null;
    expect(commit?.type === "commit" && commit.message).toBe(
      "Raise the lemon cake price\n",
    );
  });
});
