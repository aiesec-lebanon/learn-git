import { SANDBOX_HELP } from "../messages/shell";
import { cd, pwd } from "./navigate";
import { cat, echo, ls } from "./read";
import { createShellRegistry, defineShell } from "./registry";
import { mkdir, mv, rm, touch } from "./write";

const clear = defineShell({
  name: "clear",
  run: () => ({ effects: [{ kind: "screen-cleared" }] }),
});

const help = defineShell({
  name: "help",
  run: () => ({ stdout: SANDBOX_HELP }),
});

/** The sandbox's shell commands; adding one means adding it here. */
export const SHELL_REGISTRY = createShellRegistry([
  cd,
  pwd,
  ls,
  cat,
  echo,
  touch,
  mkdir,
  rm,
  mv,
  clear,
  help,
]);
