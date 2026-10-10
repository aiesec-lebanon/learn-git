import { checkout, reset } from "../cli/legacy";
import { add } from "./add";
import { commit } from "./commit";
import { config } from "./config";
import { diff } from "./diff";
import { init } from "./init";
import { log } from "./log";
import { mv } from "./mv";
import { createRegistry } from "./registry";
import { restore } from "./restore";
import { rm } from "./rm";
import { show } from "./show";
import { status } from "./status";

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
  checkout,
  reset,
]);
