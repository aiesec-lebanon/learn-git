import { reset } from "../cli/legacy";
import { checkout } from "./checkout";
import { branch } from "./branch";
import { add } from "./add";
import { clone } from "./clone";
import { commit } from "./commit";
import { config } from "./config";
import { diff } from "./diff";
import { fetch } from "./fetch";
import { init } from "./init";
import { log } from "./log";
import { merge } from "./merge";
import { mv } from "./mv";
import { createRegistry } from "./registry";
import { rebase } from "./rebase";
import { remote } from "./remote";
import { restore } from "./restore";
import { pull } from "./pull";
import { push } from "./push";
import { rm } from "./rm";
import { show } from "./show";
import { stash } from "./stash";
import { status } from "./status";
import { switchCommand } from "./switch";

/** Every simulated Git command; adding one means adding it here. */
export const GIT_REGISTRY = createRegistry([
  init,
  config,
  add,
  status,
  commit,
  log,
  diff,
  show,
  restore,
  rm,
  mv,
  branch,
  switchCommand,
  checkout,
  merge,
  stash,
  reset,
  remote,
  clone,
  fetch,
  push,
  pull,
  rebase,
]);
