import { describe, expect, it } from "vitest";
import {
  createRewriter,
  pathForms,
  rewriteDeep,
  stableJson,
} from "./rewrite.mjs";

const tmpDir = "C:\\Users\\Ada\\AppData\\Local\\Temp\\lg-fx-abc";
const rewrite = createRewriter({
  tmpDir,
  hostname: "DESKTOP-42",
  username: "Ada",
  aliases: ["/tmp/lg-fx-abc"],
});

describe("fixture rewriting", () => {
  it("knows the native, forward and MSYS spellings", () => {
    expect(pathForms(tmpDir)).toContain(
      "/c/Users/Ada/AppData/Local/Temp/lg-fx-abc",
    );
    expect(pathForms(tmpDir)).toContain(
      "C:/Users/Ada/AppData/Local/Temp/lg-fx-abc",
    );
  });

  it.each([
    [
      "Initialized empty Git repository in C:/Users/Ada/AppData/Local/Temp/lg-fx-abc/home/you/p/.git/\n",
      "Initialized empty Git repository in /home/you/p/.git/\n",
    ],
    ["/c/Users/Ada/AppData/Local/Temp/lg-fx-abc/home/you", "/home/you"],
    [
      "file:///c/Users/Ada/AppData/Local/Temp/lg-fx-abc/hub/shop.git",
      "https://hub.test/shop.git",
    ],
    [
      "bash: line 2: cd: nope: No such file or directory\n",
      "bash: cd: nope: No such file or directory\n",
    ],
    ["you@DESKTOP-42.(none)", "you@laptop.(none)"],
    ["(got 'Ada@DESKTOP-42.(none)')", "(got 'you@laptop.(none)')"],
    ["/tmp/lg-fx-abc/home/you/p\n", "/home/you/p\n"],
    [
      "/usr/bin/bash: line 2: cd: x: Not a directory\n",
      "bash: cd: x: Not a directory\n",
    ],
    ["user.name=Sam\nlog.decorate=short\n", "user.name=Sam\n"],
    ["command\tlog.decorate=short\n", ""],
    [
      "From file:///C:/Users/Ada/AppData/Local/Temp/lg-fx-abc/hub/sam/team\n",
      "From https://hub.test/sam/team\n",
    ],
    [
      "command\turl.file:///C:/Users/Ada/AppData/Local/Temp/lg-fx-abc/hub/.insteadof=https://hub.test/\n",
      "",
    ],
  ])("rewrites %j", (input, output) => {
    expect(rewrite(input)).toBe(output);
  });

  it("rewrites nested keys and values and writes sorted JSON", () => {
    const value = rewriteDeep(
      { b: ["/c/Users/Ada/AppData/Local/Temp/lg-fx-abc/x"], a: 1 },
      rewrite,
    );
    expect(stableJson(value)).toBe(
      '{\n  "a": 1,\n  "b": [\n    "/x"\n  ]\n}\n',
    );
  });
});
