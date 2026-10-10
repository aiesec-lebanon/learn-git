import { describe, expect, it } from "vitest";
import { createWorld, LIMITS, Session } from "@/engine";
import { complete } from "./complete";
import { browse, emptyHistory, remember, splitPaste } from "./history";

const world = () => {
  const s = new Session(
    createWorld({
      files: {
        "p/readme.md": "r\n",
        "p/recipes/soup.txt": "s\n",
        "p/my file.txt": "m\n",
      },
      cwd: "p",
    }),
  );
  s.run("git init");
  return s.getSnapshot().world;
};

describe("complete", () => {
  const w = world();

  it("completes programs and git subcommands", () => {
    expect(complete(w, "gi")).toEqual({ line: "git ", options: [] });
    expect(complete(w, "git ini")).toEqual({ line: "git init ", options: [] });
    expect(complete(w, "git c").options).toEqual(
      expect.arrayContaining(["commit", "config"]),
    );
  });

  it("completes flags of the subcommand", () => {
    expect(complete(w, "git commit --mes").line).toBe("git commit --message ");
  });

  it("completes paths, descending into folders and quoting spaces", () => {
    expect(complete(w, "git add rea").line).toBe("git add readme.md ");
    expect(complete(w, "git add rec").line).toBe("git add recipes/");
    expect(complete(w, "git add recipes/s").line).toBe(
      "git add recipes/soup.txt ",
    );
    expect(complete(w, "cat my").line).toBe("cat 'my file.txt' ");
  });

  it("extends to the common prefix and lists the options", () => {
    expect(complete(w, "cat re")).toEqual({
      line: "cat re",
      options: ["readme.md", "recipes/"],
    });
  });

  it("leaves the line alone when nothing matches", () => {
    expect(complete(w, "git add zzz")).toEqual({
      line: "git add zzz",
      options: [],
    });
  });
});

describe("typed history", () => {
  it("recalls earlier lines and returns to the draft", () => {
    let h = remember(remember(emptyHistory, "git init"), "git status");
    h = remember(h, "git status");
    expect(h.entries).toEqual(["git init", "git status"]);
    const up = browse(h, -1, "draft");
    expect(up.line).toBe("git status");
    const up2 = browse(up.history, -1, up.line);
    expect(up2.line).toBe("git init");
    expect(browse(up2.history, -1, up2.line).line).toBe("git init");
    const down = browse(browse(up2.history, 1, "").history, 1, "");
    expect(down.line).toBe("draft");
  });
});

describe("splitPaste", () => {
  it("splits lines and drops blanks", () => {
    expect(splitPaste("git init\r\n\r\ngit status\n")).toEqual({
      lines: ["git init", "git status"],
    });
  });

  it("refuses more lines than the cap", () => {
    const text = Array.from(
      { length: LIMITS.pasteLines + 1 },
      () => "pwd",
    ).join("\n");
    expect(splitPaste(text)).toHaveProperty("error");
  });
});
