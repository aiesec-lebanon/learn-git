import { describe, expect, it } from "vitest";
import { createWorld, Session } from "@/engine";
import { voiceProblems } from "./guide/voice";
import { emptyFolder } from "./worlds/empty-folder";

const guide =
  import.meta.glob<string>("./field-guide.mdx", {
    query: "?raw",
    import: "default",
    eager: true,
  })["./field-guide.mdx"] ?? "";

const blocks = [...guide.matchAll(/```sh\n([\s\S]*?)```/g)].flatMap(
  ([, body = ""]) => body.trim().split("\n"),
);
const configLines = blocks.filter((line) => line.startsWith("git config"));

describe("field guide", () => {
  it("is written in the guide's voice", () => {
    expect(voiceProblems(guide.replace(/```[\s\S]*?```/g, ""))).toEqual([]);
  });

  it("shows identity both ways: config set (Git 2.46+) and the older form", () => {
    expect(configLines.some((l) => l.startsWith("git config set "))).toBe(true);
    expect(configLines.some((l) => l.startsWith("git config --global "))).toBe(
      true,
    );
  });

  it.each(configLines)("the sandbox accepts %s", (line) => {
    const session = new Session(createWorld(emptyFolder));
    const [entry] = session.run(line);
    expect(entry?.outcome.output.exitCode).toBe(0);
  });
});
