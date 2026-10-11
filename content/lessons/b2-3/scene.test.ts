import { describe, expect, it } from "vitest";
import { createWorld, match, Session } from "@/engine";
import scene from "./scene";

describe("B2.3", () => {
  it("is not solved by ignoring .env while it is still tracked", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run('echo ".env" > .gitignore');
    session.run('echo "dist/" >> .gitignore');
    session.run('echo "*.log" >> .gitignore');
    session.run("git add .gitignore");
    session.run('git commit -m "Ignore"');
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });

  it("is not solved by deleting .env from disk", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run('echo ".env" > .gitignore');
    session.run('echo "dist/" >> .gitignore');
    session.run('echo "*.log" >> .gitignore');
    session.run("git rm .env");
    session.run("git add .gitignore");
    session.run('git commit -m "Ignore"');
    expect(match(session.getSnapshot().world, scene.yourTurn.target).ok).toBe(
      false,
    );
  });
});
