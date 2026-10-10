import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { REFUSAL_GUIDE } from "../../guide/refusals";
import scene from "./scene";

describe("B1.1", () => {
  it("makes the learner set an identity before the first commit", () => {
    const session = new Session(createWorld(scene.yourTurn.world));
    session.run("git init");
    session.run("git add .");
    const [commit] = session.run('git commit -m "First"');
    expect(commit?.outcome.output.stderr).toContain("Author identity unknown");
    const refusal = commit?.outcome.effects.find((e) => e.kind === "refused");
    expect(refusal).toMatchObject({ code: "identity-unknown" });
    expect(REFUSAL_GUIDE["identity-unknown"]).toContain("git config set");
  });
});
