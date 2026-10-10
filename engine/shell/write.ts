import { parentOf, relativeTo } from "../files/paths";
import { makeDir, removeFile, removeTree, writeFile } from "../files/worktree";
import { shellMessages } from "../messages/shell";
import type { Fs, PathChange } from "../types";
import {
  capsGuard,
  changeFs,
  defineShell,
  parseFlags,
  removeGuard,
  resolveFor,
  shellFail,
  unsimulated,
  writeGuard,
} from "./registry";

type Change = PathChange & { node: "file" | "dir" };

export const touch = defineShell({
  name: "touch",
  run: (ctx) => {
    const parsed = parseFlags(ctx.args, "");
    if ("unsupported" in parsed)
      return unsimulated(`touch ${parsed.unsupported}`);
    if (!parsed.operands.length)
      return shellFail(shellMessages.missingOperand("touch"));
    let fs = ctx.machine.fs;
    let stderr = "";
    const changes: Change[] = [];
    for (const name of parsed.operands) {
      const path = resolveFor(ctx.machine, name);
      const guard = writeGuard(path);
      if (guard) return unsimulated(guard);
      if (fs.files.has(path) || fs.dirs.has(path)) continue;
      if (!fs.dirs.has(parentOf(path))) {
        stderr += shellMessages.touchMissing(name);
        continue;
      }
      fs = writeFile(fs, path, "");
      changes.push({ path, change: "added", node: "file" });
    }
    const cap = capsGuard(fs);
    if (cap) return unsimulated(cap);
    return changeFs(ctx, fs, changes, { stderr, exitCode: stderr ? 1 : 0 });
  },
});

export const mkdir = defineShell({
  name: "mkdir",
  run: (ctx) => {
    const parsed = parseFlags(ctx.args, "p");
    if ("unsupported" in parsed)
      return unsimulated(`mkdir ${parsed.unsupported}`);
    if (!parsed.operands.length)
      return shellFail(shellMessages.missingOperand("mkdir"));
    const parents = parsed.flags.has("p");
    let fs = ctx.machine.fs;
    let stderr = "";
    const changes: Change[] = [];
    for (const name of parsed.operands) {
      const path = resolveFor(ctx.machine, name);
      const guard = writeGuard(path);
      if (guard) return unsimulated(guard);
      if (fs.files.has(path) || (fs.dirs.has(path) && !parents)) {
        stderr += shellMessages.mkdirExists(name);
      } else if (!parents && !fs.dirs.has(parentOf(path))) {
        stderr += shellMessages.mkdirMissing(name);
      } else if (!fs.dirs.has(path)) {
        const before = fs.dirs;
        fs = makeDir(fs, path);
        for (const dir of fs.dirs) {
          if (!before.has(dir))
            changes.push({ path: dir, change: "added", node: "dir" });
        }
      }
    }
    return changeFs(ctx, fs, changes, { stderr, exitCode: stderr ? 1 : 0 });
  },
});

function deletedUnder(fs: Fs, path: string): Change[] {
  const inside = (p: string) => p === path || relativeTo(path, p) !== null;
  return [
    ...[...fs.files.keys()].filter(inside).map((p) => ({
      path: p,
      change: "deleted" as const,
      node: "file" as const,
    })),
    ...[...fs.dirs].filter(inside).map((p) => ({
      path: p,
      change: "deleted" as const,
      node: "dir" as const,
    })),
  ];
}

export const rm = defineShell({
  name: "rm",
  run: (ctx) => {
    const parsed = parseFlags(ctx.args, "rRf");
    if ("unsupported" in parsed) return unsimulated(`rm ${parsed.unsupported}`);
    const { flags, operands } = parsed;
    const force = flags.has("f");
    const recursive = flags.has("r") || flags.has("R");
    if (!operands.length)
      return force ? {} : shellFail(shellMessages.missingOperand("rm"));
    let fs = ctx.machine.fs;
    let stderr = "";
    const changes: Change[] = [];
    for (const name of operands) {
      const path = resolveFor(ctx.machine, name);
      const guard = removeGuard(ctx.world, ctx.machine, path);
      if (guard) return unsimulated(guard);
      if (fs.files.has(path)) {
        fs = removeFile(fs, path);
        changes.push({ path, change: "deleted", node: "file" });
      } else if (fs.dirs.has(path)) {
        if (!recursive) {
          stderr += shellMessages.rmIsDir(name);
          continue;
        }
        changes.push(...deletedUnder(fs, path));
        fs = removeTree(fs, path);
      } else if (!force) {
        stderr += shellMessages.rmMissing(name);
      }
    }
    return changeFs(ctx, fs, changes, { stderr, exitCode: stderr ? 1 : 0 });
  },
});

function movePath(fs: Fs, from: string, to: string): Fs {
  const rebase = (p: string) => {
    const rel = relativeTo(from, p);
    return rel === null ? p : rel === "" ? to : `${to}/${rel}`;
  };
  return {
    files: new Map([...fs.files].map(([p, c]) => [rebase(p), c])),
    dirs: new Set([...fs.dirs].map(rebase)),
  };
}

export const mv = defineShell({
  name: "mv",
  run: (ctx) => {
    const parsed = parseFlags(ctx.args, "");
    if ("unsupported" in parsed) return unsimulated(`mv ${parsed.unsupported}`);
    const { operands } = parsed;
    const target = operands.at(-1);
    if (operands.length < 2 || target === undefined) {
      return shellFail(shellMessages.missingOperand("mv"));
    }
    const { machine } = ctx;
    const targetPath = resolveFor(machine, target);
    const intoDir = machine.fs.dirs.has(targetPath);
    if (operands.length > 2 && !intoDir)
      return shellFail(shellMessages.mvNotDir(target));
    let fs = machine.fs;
    let stderr = "";
    const changes: Change[] = [];
    for (const name of operands.slice(0, -1)) {
      const from = resolveFor(machine, name);
      const to = intoDir
        ? `${targetPath === "/" ? "" : targetPath}/${from.slice(from.lastIndexOf("/") + 1)}`
        : targetPath;
      const guard = removeGuard(ctx.world, machine, from) ?? writeGuard(to);
      if (guard) return unsimulated(guard);
      const isDir = fs.dirs.has(from);
      if (!isDir && !fs.files.has(from)) {
        stderr += shellMessages.mvMissing(name);
      } else if (isDir && relativeTo(from, to) !== null) {
        stderr += shellMessages.mvIntoSelf(
          name,
          intoDir ? `${target.replace(/\/$/, "")}/${name}` : target,
        );
      } else if (isDir && fs.files.has(to)) {
        stderr += shellMessages.mvDirOverFile(target, name);
      } else if (!fs.dirs.has(parentOf(to))) {
        stderr += shellMessages.mvNoParent(name, target);
      } else if (from !== to) {
        const deleted = isDir
          ? deletedUnder(fs, from)
          : [{ path: from, change: "deleted" as const, node: "file" as const }];
        const replaced = fs.files.has(to);
        fs = isDir
          ? movePath(fs, from, to)
          : writeFile(removeFile(fs, from), to, fs.files.get(from) ?? "");
        changes.push(
          ...deleted,
          ...deleted.map((c) => ({
            ...c,
            path:
              c.path === from ? to : `${to}/${relativeTo(from, c.path) ?? ""}`,
            change:
              c.path === from && replaced
                ? ("modified" as const)
                : ("added" as const),
          })),
        );
      }
    }
    return changeFs(ctx, fs, changes, { stderr, exitCode: stderr ? 1 : 0 });
  },
});
