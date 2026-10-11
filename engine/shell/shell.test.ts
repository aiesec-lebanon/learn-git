import { describe, expect, it } from "vitest";
import { createWorld } from "../world/create";
import { runLine } from "../run";
import type { Repo, World } from "../types";
import { machineOf, repoIdFor, withRepo } from "../world/access";
import { expandWord } from "./glob";

const start = () =>
  createWorld({
    files: { "p/a.txt": "a\n", "p/b.md": "b\n", "p/src/x.ts": "x\n" },
    dirs: ["p/.git"],
    cwd: "p",
  });

function sh(line: string, world: World = start()) {
  const { world: after, outcomes } = runLine(world, line);
  const last = outcomes.at(-1);
  return {
    world: after,
    out: (last?.output.stdout ?? "") + (last?.output.stderr ?? ""),
    code: last?.output.exitCode,
    effects: last?.effects ?? [],
  };
}

const files = (w: World) => [...machineOf(w).fs.files.keys()];

describe("pseudo-shell", () => {
  it("clears the screen and prints sandbox help", () => {
    expect(sh("clear").effects).toEqual([{ kind: "screen-cleared" }]);
    expect(sh("help").out).toContain("Shell commands in this sandbox");
  });

  it.each([
    ["ls -l", "not simulated here: ls -l\n"],
    ["cat", "not simulated here: cat without a file (reading the keyboard)\n"],
    ["cat -n a.txt", "not simulated here: cat -n\n"],
    ["cd -", "not simulated here: cd - (the previous folder)\n"],
    ["cd .git", "not simulated here: folders inside .git\n"],
    [
      "ls .git/x",
      "not simulated here: files inside .git (Git's own storage)\n",
    ],
    [
      "cat .git/HEAD",
      "not simulated here: files inside .git (Git's own storage)\n",
    ],
    [
      "touch .git/x",
      "not simulated here: files inside .git (Git's own storage)\n",
    ],
    [
      "echo x > .git/x",
      "not simulated here: files inside .git (Git's own storage)\n",
    ],
    [
      "echo x > 'a\u0000b'",
      "not simulated here: control characters in file names\n",
    ],
    [
      "touch 'e\u001b[31m'",
      "not simulated here: control characters in file names\n",
    ],
    [
      "mkdir 'd\u007f'",
      "not simulated here: control characters in file names\n",
    ],
    [
      "rm -r .",
      "not simulated here: removing the current folder or one above it\n",
    ],
    ["cd a b", "bash: cd: too many arguments\n"],
    ["rm", "rm: missing operand\nTry 'rm --help' for more information.\n"],
    [
      "mv a.txt",
      "mv: missing operand\nTry 'mv --help' for more information.\n",
    ],
    [
      "touch",
      "touch: missing operand\nTry 'touch --help' for more information.\n",
    ],
    [
      "mkdir",
      "mkdir: missing operand\nTry 'mkdir --help' for more information.\n",
    ],
    ["mv a.txt b.md src2", "mv: target 'src2' is not a directory\n"],
    [
      "mv src src/deeper",
      "mv: cannot move 'src' to a subdirectory of itself, 'src/deeper'\n",
    ],
    [
      "mv src a.txt",
      "mv: cannot overwrite non-directory 'a.txt' with directory 'src'\n",
    ],
    [
      "mv a.txt no/where",
      "mv: cannot move 'a.txt' to 'no/where': No such file or directory\n",
    ],
    ["mkdir a.txt", "mkdir: cannot create directory 'a.txt': File exists\n"],
    ["cat 'my notes.txt'", "cat: 'my notes.txt': No such file or directory\n"],
    ["frob", "bash: frob: command not found\n"],
  ])("%s", (line, out) => {
    expect(sh(line).out).toBe(out);
  });

  it("keeps a repository's folder in place", () => {
    const repo = {
      id: repoIdFor("you", "/home/you/p"),
      machine: "you",
      workdir: "/home/you/p",
    } as Repo;
    const world = withRepo(createWorld({ dirs: ["p"] }), repo);
    expect(sh("rm -rf p", world).out).toBe(
      "not simulated here: moving or deleting a repository's folder\n",
    );
    expect(sh("mv p q", world).code).toBe(1);
  });

  it("moves several files into a folder and replaces files", () => {
    const moved = sh("mv a.txt b.md src");
    expect(files(moved.world)).toEqual([
      "/home/you/p/src/x.ts",
      "/home/you/p/src/a.txt",
      "/home/you/p/src/b.md",
    ]);
    const replaced = sh("mv a.txt b.md");
    expect(machineOf(replaced.world).fs.files.get("/home/you/p/b.md")).toBe(
      "a\n",
    );
    expect(replaced.effects).toEqual([
      {
        kind: "files-changed",
        machine: "you",
        changes: [
          { path: "/home/you/p/a.txt", change: "deleted", node: "file" },
          { path: "/home/you/p/b.md", change: "modified", node: "file" },
        ],
      },
    ]);
    expect(sh("mv a.txt a.txt").effects).toEqual([]);
  });

  it("echoes with -n, -e and -E", () => {
    expect(sh("echo -e 'a\\tb\\n'").out).toBe("a\tb\n\n");
    expect(sh("echo -E 'a\\tb'").out).toBe("a\\tb\n");
    expect(sh("echo -nx").out).toBe("-nx\n");
  });

  it("lists with -A and redirects any command's output", () => {
    expect(sh("ls -A").out).toBe(".git\na.txt\nb.md\nsrc\n");
    const redirected = sh("ls > list.txt");
    expect(
      machineOf(redirected.world).fs.files.get("/home/you/p/list.txt"),
    ).toBe("a.txt\nb.md\nlist.txt\nsrc\n");
    expect(redirected.out).toBe("");
    const appended = sh("git --version >> a.txt");
    expect(machineOf(appended.world).fs.files.get("/home/you/p/a.txt")).toBe(
      "a\ngit version 2.45.1.windows.1\n",
    );
    expect(sh("> empty.txt").effects).toEqual([
      {
        kind: "files-changed",
        machine: "you",
        changes: [
          { path: "/home/you/p/empty.txt", change: "added", node: "file" },
        ],
      },
    ]);
    expect(
      sh("cat a.txt > a.txt").world && files(sh("cat a.txt > a.txt").world),
    ).toContain("/home/you/p/a.txt");
    expect(
      machineOf(sh("rm a.txt > a.txt").world).fs.files.has("/home/you/p/a.txt"),
    ).toBe(false);
  });

  it("refuses files over the caps", () => {
    expect(sh(`echo ${"x".repeat(1900)} >> a.txt`).code).toBe(0);
    const big = createWorld({
      files: { "p/big.txt": "y".repeat(100_000) },
      cwd: "p",
    });
    expect(sh("echo more >> big.txt", big).out).toBe(
      "not simulated here: files larger than 100000 characters\n",
    );
    const many = createWorld({
      files: Object.fromEntries(
        Array.from({ length: 500 }, (_, i) => [`p/f${i}`, ""]),
      ),
      cwd: "p",
    });
    expect(sh("touch extra", many).out).toBe(
      "not simulated here: more than 500 files\n",
    );
    expect(sh(`mkdir -p ${"d/".repeat(20)}`).out).toBe(
      "not simulated here: paths deeper than 20 folders\n",
    );
  });
});

describe("expandWord", () => {
  const { fs } = machineOf(start());
  const cwd = "/home/you/p";
  it.each([
    ["*.txt", ["a.txt"]],
    ["?.md", ["b.md"]],
    ["[ab].*", ["a.txt", "b.md"]],
    ["[!a]*", ["b.md", "src"]],
    ["src/*", ["src/x.ts"]],
    ["*/*.ts", ["src/x.ts"]],
    ["/home/you/p/*.md", ["/home/you/p/b.md"]],
    ["../p/a*", ["../p/a.txt"]],
    ["nope*", ["nope*"]],
    ["[x", ["[x"]],
    ["a\\*", ["a*"]],
  ])("%s", (pattern, expected) => {
    expect(
      expandWord(fs, cwd, { text: pattern.replace(/\\/g, ""), pattern }),
    ).toEqual(expected);
  });
});
