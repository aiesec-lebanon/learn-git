import { shellMessages } from "../messages/shell";
import { withMachine } from "../world/access";
import { defineShell, resolveFor, shellFail, unsimulated } from "./registry";

export const pwd = defineShell({
  name: "pwd",
  run: ({ machine }) => ({ stdout: `${machine.cwd}\n` }),
});

export const cd = defineShell({
  name: "cd",
  run: ({ world, machine, args }) => {
    if (args.length > 1) return shellFail(shellMessages.cdTooMany());
    const [target] = args;
    if (target === "-") return unsimulated("cd - (the previous folder)");
    const dir =
      target === undefined ? machine.home : resolveFor(machine, target);
    if (target !== undefined && !machine.fs.dirs.has(dir)) {
      return shellFail(
        machine.fs.files.has(dir)
          ? shellMessages.cdNotDir(target)
          : shellMessages.cdMissing(target),
      );
    }
    if (dir.split("/").includes(".git"))
      return unsimulated("folders inside .git");
    if (dir === machine.cwd) return {};
    return {
      world: withMachine(world, { ...machine, cwd: dir }),
      effects: [
        {
          kind: "cwd-changed",
          machine: machine.id,
          from: machine.cwd,
          to: dir,
        },
      ],
    };
  },
});
