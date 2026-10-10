import { parentOf } from "../files/paths";
import { writeFile } from "../files/worktree";
import { shellMessages as m } from "../messages/shell";
import {
  capsGuard,
  changeFs,
  defineShell,
  resolveFor,
  shellFail,
  unsimulated,
  writeGuard,
} from "./registry";

/** The sandbox's editor (not a Git Bash command): asks the UI for the file's new text. */
export const edit = defineShell({
  name: "edit",
  run: (ctx) => {
    const [name, ...extra] = ctx.args;
    if (name === undefined || extra.length) return shellFail(m.editUsage());
    const { fs } = ctx.machine;
    const path = resolveFor(ctx.machine, name);
    const guard = writeGuard(path);
    if (guard) return unsimulated(guard);
    if (fs.dirs.has(path)) return shellFail(m.editIsDir(name));
    if (!fs.dirs.has(parentOf(path))) return shellFail(m.editMissing(name));
    const current = fs.files.get(path);
    const { answer } = ctx;
    if (answer === undefined) {
      return {
        request: {
          kind: "editor",
          purpose: "file",
          file: name,
          initial: current ?? "",
        },
      };
    }
    if (answer === current) return {};
    const next = writeFile(fs, path, answer);
    const cap = capsGuard(next, answer);
    if (cap) return unsimulated(cap);
    const change = current === undefined ? "added" : "modified";
    return changeFs(ctx, next, [{ path, change, node: "file" }]);
  },
});
