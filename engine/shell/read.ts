import { isGitPath, listDir } from "../files/worktree";
import { shellMessages } from "../messages/shell";
import { compareBytes } from "../util/compare";
import { defineShell, parseFlags, resolveFor, unsimulated } from "./registry";

export const ls = defineShell({
  name: "ls",
  run: ({ machine, args }) => {
    const parsed = parseFlags(args, "aA1");
    if ("unsupported" in parsed) return unsimulated(`ls ${parsed.unsupported}`);
    const { flags, operands } = parsed;
    const names = operands.length ? operands : ["."];
    let stderr = "";
    const files: string[] = [];
    const dirs: [string, string][] = [];
    for (const name of names) {
      const path = resolveFor(machine, name);
      if (isGitPath(path))
        return unsimulated("files inside .git (Git's own storage)");
      if (machine.fs.dirs.has(path)) dirs.push([name, path]);
      else if (machine.fs.files.has(path)) files.push(name);
      else stderr += shellMessages.lsMissing(name);
    }
    const entries = (dir: string) => {
      const listed = listDir(machine.fs, dir).map((e) => e.name);
      const visible =
        flags.has("a") || flags.has("A")
          ? listed
          : listed.filter((n) => !n.startsWith("."));
      return flags.has("a") ? [".", "..", ...visible] : visible;
    };
    const blocks: string[] = [];
    if (files.length)
      blocks.push(
        files
          .sort(compareBytes)
          .map((f) => `${f}\n`)
          .join(""),
      );
    const labelled = names.length > 1;
    for (const [name, path] of dirs.sort(([a], [b]) => compareBytes(a, b))) {
      const body = entries(path)
        .map((e) => `${e}\n`)
        .join("");
      blocks.push(labelled ? `${name}:\n${body}` : body);
    }
    return { stdout: blocks.join("\n"), stderr, exitCode: stderr ? 2 : 0 };
  },
});

export const cat = defineShell({
  name: "cat",
  run: ({ machine, args }) => {
    if (args.length === 0)
      return unsimulated("cat without a file (reading the keyboard)");
    const parsed = parseFlags(args, "");
    if ("unsupported" in parsed)
      return unsimulated(`cat ${parsed.unsupported}`);
    let stdout = "";
    let stderr = "";
    for (const name of parsed.operands) {
      const path = resolveFor(machine, name);
      if (isGitPath(path))
        return unsimulated("files inside .git (Git's own storage)");
      const content = machine.fs.files.get(path);
      if (content !== undefined) stdout += content;
      else if (machine.fs.dirs.has(path))
        stderr += shellMessages.catIsDir(name);
      else stderr += shellMessages.catMissing(name);
    }
    return { stdout, stderr, exitCode: stderr ? 1 : 0 };
  },
});

const ESCAPES: ReadonlyMap<string, string> = new Map([
  ["n", "\n"],
  ["t", "\t"],
  ["\\", "\\"],
]);

export const echo = defineShell({
  name: "echo",
  run: ({ args }) => {
    let at = 0;
    const flags = new Set<string>();
    while (/^-[neE]+$/.test(args[at] ?? "")) {
      for (const f of (args[at] ?? "").slice(1)) flags.add(f);
      at++;
    }
    let text = args.slice(at).join(" ");
    if (flags.has("e") && !flags.has("E")) {
      text = text.replace(/\\(.)/g, (m, c: string) => ESCAPES.get(c) ?? m);
    }
    return { stdout: flags.has("n") ? text : `${text}\n` };
  },
});
