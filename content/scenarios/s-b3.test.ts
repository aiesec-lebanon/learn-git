import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { writeFile } from "../define";
import { MENU_AGREED } from "../worlds/bake-sale";
import { actsReached } from "./acts";
import scene from "./s-b3";

const start = () => new Session(createWorld(scene.world));

const refusals = (session: Session, line: string) =>
  session
    .run(line)
    .flatMap((e) => e.outcome.effects)
    .flatMap((e) => (e.kind === "refused" ? [e.code] : []));

describe("S-B3 detours", () => {
  it("rejects the plain push, stops a pull without a choice, and refuses a force push", () => {
    const session = start();
    expect(refusals(session, "git push")).toEqual(["push-rejected"]);
    expect(refusals(session, "git pull")).toEqual(["divergent-branches"]);
    expect(refusals(session, "git push --force")).toEqual(["remote-rejected"]);
    expect(actsReached(scene, session.getSnapshot().world)).toBe(1);
  });

  it("accepts replaying your commit on top of Sam's", () => {
    const session = start();
    session.run("git pull --rebase");
    session.run(writeFile("menu.html", MENU_AGREED));
    session.run("git add menu.html");
    session.run("git rebase --continue");
    if (session.getSnapshot().pending) session.resume(null);
    expect(actsReached(scene, session.getSnapshot().world)).toBe(2);
    session.run("git push");
    expect(actsReached(scene, session.getSnapshot().world)).toBe(3);
  });
});
