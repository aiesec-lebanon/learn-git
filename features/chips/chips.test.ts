import { describe, expect, it } from "vitest";
import { commands, createWorld, Session } from "@/engine";
import { compose, missing } from "./composer";
import { chipState, pathChoices, rank, VERBS, type ChipState } from "./palette";

const verb = (name: string) => {
  const found = VERBS.find((v) => v.name === name);
  if (!found) throw new Error(name);
  return found;
};

const session = () =>
  new Session(
    createWorld({
      files: { "p/a.txt": "a\n", "p/my notes.txt": "n\n" },
      dirs: ["p/src"],
      cwd: "p",
    }),
  );

describe("chip verbs", () => {
  it("cover every simulated command with flags from its definition", () => {
    const info = commands();
    for (const c of info.filter((c) => c.program === "git"))
      expect(
        VERBS.some((v) => v.program === "git" && v.name === c.name),
        c.name,
      ).toBe(true);
    for (const v of VERBS) {
      const def = info.find(
        (c) => c.program === v.program && c.name === v.name,
      );
      expect(def, v.name).toBeDefined();
      for (const p of v.params)
        if (p.kind === "flag" || (p.kind === "value" && p.flag))
          expect(def?.flags, `${v.name} ${p.flag}`).toContain(p.flag);
    }
  });
});

describe("rank", () => {
  const names = (s: ChipState) => rank(s).map((v) => v.name);
  const none: ChipState = {
    repo: false,
    commits: false,
    changed: false,
    staged: false,
    files: true,
  };

  it("puts valid verbs first", () => {
    expect(names(none).slice(0, 2)).toEqual(["init", "config"]);
    expect(names(none).indexOf("commit")).toBeGreaterThan(
      names(none).indexOf("clear"),
    );
    const staged = names({ ...none, repo: true, staged: true });
    expect(staged.indexOf("commit")).toBeLessThan(staged.indexOf("ls"));
    expect(staged.indexOf("init")).toBeGreaterThan(staged.indexOf("clear"));
  });

  it("reads the state from the world", () => {
    const s = session();
    expect(chipState(s.getSnapshot().world)).toMatchObject({
      repo: false,
      files: true,
    });
    s.run("git init && git add a.txt");
    expect(chipState(s.getSnapshot().world)).toMatchObject({
      repo: true,
      commits: false,
      changed: true,
      staged: true,
    });
  });
});

describe("pathChoices", () => {
  it("offers changed files, files and folders relative to here", () => {
    const s = session();
    s.run("git init");
    const world = s.getSnapshot().world;
    expect(pathChoices(world, "changed")).toEqual([
      ".",
      "a.txt",
      "my notes.txt",
    ]);
    expect(pathChoices(world, "files")).toEqual(["a.txt", "my notes.txt"]);
    expect(pathChoices(world, "dirs")).toEqual(["..", "src"]);
  });
});

describe("compose", () => {
  it("builds the command in parameter order and quotes values", () => {
    expect(compose(verb("commit"), ["Fix the 'typo'"])).toBe(
      String.raw`git commit -m 'Fix the '\''typo'\'''`,
    );
    expect(compose(verb("add"), [false, ["a.txt", "my notes.txt"]])).toBe(
      "git add a.txt 'my notes.txt'",
    );
    expect(compose(verb("config"), [true, "user.name", "Ada Lovelace"])).toBe(
      "git config --global user.name 'Ada Lovelace'",
    );
    expect(compose(verb("log"), [true, "  "])).toBe("git log --oneline");
    expect(compose(verb("ls"), [])).toBe("ls");
  });

  it("names the first missing required parameter", () => {
    expect(missing(verb("commit"), [" "])).toBe("message");
    expect(missing(verb("commit"), ["Start"])).toBeNull();
    expect(missing(verb("add"), [])).toBeNull();
  });

  it("composes commands the engine runs as typed", () => {
    const s = session();
    s.run(compose(verb("init"), []));
    s.run(compose(verb("add"), [false, ["my notes.txt"]]));
    s.run(compose(verb("commit"), ["Add 'notes'"]));
    const [entry] = s.getSnapshot().latest;
    expect(entry?.outcome.output.exitCode).toBe(0);
    expect(entry?.outcome.output.stdout).toContain("Add 'notes'");
  });
});
